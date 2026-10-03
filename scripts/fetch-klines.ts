/**
 * Downloads historical candles from the public Bybit v5 API into public/data/*.json.
 * Spec: docs/02-architecture/market-data.md
 *
 *   npm run data:fetch                 # all datasets
 *   npm run data:fetch -- BTCUSDT-240  # one dataset
 *   npm run data:fetch -- --from-csv file.csv BTCUSDT-240   # fallback: convert a CSV export
 *   npm run data:fetch -- --extend-back 2025-06-01 BTCUSDT-60  # prepend older history
 *
 * Lessons, scenarios and exams point at candles by index. A full re-download moves the end of a
 * dataset, and --extend-back shifts every index by the number of prepended candles (printed):
 * update the content references in the same commit.
 *
 * Existing files are only replaced after a fully successful download.
 */
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.bybit.com/v5/market/kline';
const OUT_DIR = path.resolve(import.meta.dirname, '../public/data');
const PAGE_LIMIT = 1000;
const PAUSE_MS = 200;

type Interval = '60' | '240' | 'D';
interface DatasetSpec {
  symbol: string;
  interval: Interval;
  /** Stop after this many candles… */
  count?: number;
  /** …or when reaching this date (ms). */
  since?: number;
}

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const DATASETS: DatasetSpec[] = SYMBOLS.flatMap((symbol) => [
  // 1H from June 2025: the simulator needs the same moment on 1H, 4H and 1D (simulator.md).
  { symbol, interval: '60', since: Date.UTC(2025, 5, 1) },
  { symbol, interval: '240', count: 3000 },
  { symbol, interval: 'D', since: Date.UTC(2020, 0, 1) },
]);

const INTERVAL_MS: Record<Interval, number> = {
  '60': 3_600_000,
  '240': 14_400_000,
  D: 86_400_000,
};

type Row = [number, number, number, number, number, number];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(spec: DatasetSpec, end: number): Promise<Row[]> {
  const url = new URL(API);
  url.search = new URLSearchParams({
    category: 'linear',
    symbol: spec.symbol,
    interval: spec.interval,
    end: String(end),
    limit: String(PAGE_LIMIT),
  }).toString();

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        retCode: number;
        retMsg: string;
        result?: { list?: string[][] };
      };
      if (body.retCode !== 0) throw new Error(`Bybit retCode ${body.retCode}: ${body.retMsg}`);
      return (body.result?.list ?? []).map((r) => {
        const [t, o, h, l, c, v] = r.map(Number) as Row;
        return [t, o, h, l, c, Math.round(v * 100) / 100];
      });
    } catch (error) {
      lastError = error;
      await sleep(500 * 2 ** attempt);
    }
  }
  throw new Error(`Failed ${spec.symbol}-${spec.interval}: ${String(lastError)}`);
}

export function normalize(
  rows: Row[],
  intervalMs: number,
  now: number,
): { candles: Row[]; gaps: number } {
  const byTime = new Map<number, Row>();
  for (const r of rows) byTime.set(r[0], r);
  const candles = [...byTime.values()]
    .sort((a, b) => a[0] - b[0])
    // drop the still-forming last candle
    .filter((r) => r[0] + intervalMs <= now);
  let gaps = 0;
  for (let i = 1; i < candles.length; i++) {
    if ((candles[i]?.[0] ?? 0) - (candles[i - 1]?.[0] ?? 0) !== intervalMs) gaps++;
  }
  return { candles, gaps };
}

async function download(spec: DatasetSpec): Promise<void> {
  const name = `${spec.symbol}-${spec.interval}`;
  const now = Date.now();
  const rows: Row[] = [];
  let end = now;
  for (;;) {
    const page = await fetchPage(spec, end);
    if (page.length === 0) break;
    rows.push(...page);
    const oldest = Math.min(...page.map((r) => r[0]));
    if (spec.count && rows.length >= spec.count + 1) break;
    if (spec.since && oldest <= spec.since) break;
    if (page.length < PAGE_LIMIT) break;
    end = oldest - 1;
    await sleep(PAUSE_MS);
  }

  const normalized = normalize(rows, INTERVAL_MS[spec.interval], now);
  const { gaps } = normalized;
  let { candles } = normalized;
  if (spec.count) candles = candles.slice(-spec.count);
  if (spec.since) candles = candles.filter((r) => r[0] >= (spec.since ?? 0));
  if (candles.length < 100)
    throw new Error(`${name}: only ${candles.length} candles — refusing to write`);

  writeDataset(name, spec.symbol, spec.interval, candles);
  const from = new Date(candles[0]?.[0] ?? 0).toISOString().slice(0, 10);
  const to = new Date(candles.at(-1)?.[0] ?? 0).toISOString().slice(0, 10);
  console.log(
    `${name}: ${candles.length} candles ${from} → ${to}${gaps ? `, ⚠ ${gaps} gaps` : ''}`,
  );
}

function writeDataset(name: string, symbol: string, interval: string, candles: Row[]): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${name}.json`);
  const json = JSON.stringify({ symbol, interval, fetchedAt: Date.now(), candles });
  // write to a temp file first so a crash never leaves a half-written dataset
  fs.writeFileSync(`${file}.tmp`, json);
  fs.renameSync(`${file}.tmp`, file);
}

/** Fallback when the API is unreachable: CSV with time(ms or ISO),open,high,low,close,volume. */
function fromCsv(csvPath: string, name: string): void {
  const [symbol = '', interval = ''] = name.split('-');
  const rows: Row[] = fs
    .readFileSync(csvPath, 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [t = '', ...rest] = line.split(',');
      const time = /^\d+$/.test(t) ? Number(t) : Date.parse(t);
      return [time, ...rest.slice(0, 5).map(Number)] as Row;
    })
    .filter((r) => r.every((n) => Number.isFinite(n)));
  const { candles, gaps } = normalize(rows, INTERVAL_MS[interval as Interval] ?? 0, Date.now());
  writeDataset(name, symbol, interval, candles);
  console.log(`${name}: ${candles.length} candles from CSV${gaps ? `, ⚠ ${gaps} gaps` : ''}`);
}

/** Prepends older candles to an existing dataset; the newest candles stay exactly as they are. */
async function extendBack(name: string, sinceIso: string): Promise<void> {
  const [symbol = '', interval = ''] = name.split('-');
  const intervalMs = INTERVAL_MS[interval as Interval];
  const since = Date.parse(sinceIso);
  if (!intervalMs || !Number.isFinite(since))
    throw new Error('Usage: --extend-back <YYYY-MM-DD> <SYMBOL-INTERVAL>');
  const file = path.join(OUT_DIR, `${name}.json`);
  const existing = JSON.parse(fs.readFileSync(file, 'utf8')) as { candles: Row[] };
  const first = existing.candles[0]?.[0];
  if (first === undefined) throw new Error(`${name}: empty dataset`);
  if (since >= first) {
    console.log(`${name}: already starts at ${new Date(first).toISOString()} — nothing to add`);
    return;
  }
  const spec: DatasetSpec = { symbol, interval: interval as Interval, since };
  const rows: Row[] = [];
  let end = first - 1;
  for (;;) {
    const page = await fetchPage(spec, end);
    if (page.length === 0) break;
    rows.push(...page);
    const oldest = Math.min(...page.map((r) => r[0]));
    if (oldest <= since || page.length < PAGE_LIMIT) break;
    end = oldest - 1;
    await sleep(PAUSE_MS);
  }
  const older = normalize(rows, intervalMs, first).candles.filter((r) => r[0] >= since);
  const joint = (older.at(-1)?.[0] ?? 0) + intervalMs;
  if (joint !== first)
    throw new Error(`${name}: gap at the joint (${new Date(joint).toISOString()})`);
  writeDataset(name, symbol, interval, [...older, ...existing.candles]);
  console.log(
    `${name}: +${older.length} candles before ${new Date(first).toISOString()} — shift indexes by ${older.length}`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--extend-back') {
    const [, sinceIso, ...names] = args;
    if (!sinceIso || names.length === 0)
      throw new Error('Usage: --extend-back <YYYY-MM-DD> <SYMBOL-INTERVAL>…');
    for (const name of names) await extendBack(name, sinceIso);
    return;
  }
  if (args[0] === '--from-csv') {
    const [, csv, name] = args;
    if (!csv || !name) throw new Error('Usage: --from-csv <file.csv> <SYMBOL-INTERVAL>');
    fromCsv(csv, name);
    return;
  }
  const selected = args.length
    ? DATASETS.filter((d) => args.includes(`${d.symbol}-${d.interval}`))
    : DATASETS;
  for (const spec of selected) await download(spec);
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(String(error));
    process.exitCode = 1;
  });
}
