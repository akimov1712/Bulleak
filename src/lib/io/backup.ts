/**
 * Backup file (storage.md «Экспорт / импорт»): build on export, validate and migrate on
 * import. Pure — reading/writing stores and IndexedDB is the settings page's job.
 * Validation is hand-written (no zod): progress goes through migrateProgress, settings through
 * sanitizeSettings, trade records through the guards below.
 */
import { migrateProgress } from '@/lib/progress/migrate';
import { PROGRESS_VERSION } from '@/lib/progress/initial';
import { sanitizeSettings } from '@/lib/settings';
import { toDateKey } from '@/lib/date';
import type { ProgressState } from '@/types/progress';
import type { Settings } from '@/types/settings';
import type { JournalTrade, SimTrade } from '@/types/trading';

export const BACKUP_APP = 'trading-course';
export const BACKUP_SCHEMA = 1;

export interface ExportFile {
  app: typeof BACKUP_APP;
  schema: number;
  exportedAt: number;
  /** Version of ProgressState inside, for migrations. */
  progressVersion: number;
  progress: ProgressState;
  settings: Settings;
  simTrades: SimTrade[];
  journal: JournalTrade[];
  /** Simulator virtual balance. */
  simBalance?: number;
}

export function buildExport(data: {
  progress: ProgressState;
  settings: Settings;
  simTrades: SimTrade[];
  journal: JournalTrade[];
  simBalance?: number;
  now: number;
}): ExportFile {
  return {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: data.now,
    progressVersion: PROGRESS_VERSION,
    progress: data.progress,
    settings: data.settings,
    simTrades: data.simTrades,
    journal: data.journal,
    ...(data.simBalance !== undefined ? { simBalance: data.simBalance } : {}),
  };
}

export const backupFileName = (now: number) => `trading-course-backup-${toDateKey(now)}.json`;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optNum = (v: unknown) => v === undefined || num(v);
const str = (v: unknown): v is string => typeof v === 'string';
const oneOf =
  <T extends string>(...values: T[]) =>
  (v: unknown): v is T =>
    typeof v === 'string' && (values as string[]).includes(v);

const isSide = oneOf('long', 'short');

export function isSimTrade(v: unknown): v is SimTrade {
  return (
    isObj(v) &&
    optNum(v.id) &&
    num(v.at) &&
    (v.scenarioId === null || str(v.scenarioId)) &&
    (v.strategyTag === undefined || str(v.strategyTag)) &&
    str(v.dataset) &&
    num(v.startIndex) &&
    isSide(v.side) &&
    [v.entry, v.sl, v.tp, v.riskPct, v.balanceBefore, v.qty, v.exitPrice, v.exitIndex].every(num) &&
    oneOf('tp', 'sl', 'timeout', 'manual')(v.outcome) &&
    num(v.pnl) &&
    num(v.r) &&
    num(v.fees) &&
    (v.notes === undefined || str(v.notes))
  );
}

export function isJournalTrade(v: unknown): v is JournalTrade {
  return (
    isObj(v) &&
    optNum(v.id) &&
    num(v.openedAt) &&
    optNum(v.closedAt) &&
    oneOf('demo', 'testnet', 'real')(v.account) &&
    str(v.symbol) &&
    isSide(v.side) &&
    oneOf('spot', 'perp')(v.market) &&
    [v.entry, v.sl, v.qty, v.leverage, v.fees].every(num) &&
    optNum(v.exit) &&
    optNum(v.tp) &&
    optNum(v.pnl) &&
    optNum(v.r) &&
    str(v.setup) &&
    oneOf('1H', '4H', '1D', 'other')(v.timeframe) &&
    typeof v.followedPlan === 'boolean' &&
    oneOf('calm', 'fear', 'greed', 'fomo', 'revenge', 'bored')(v.emotion) &&
    str(v.notes) &&
    Array.isArray(v.tags) &&
    v.tags.every(str)
  );
}

export interface ImportPreview {
  lessonsCompleted: number;
  xp: number;
  simTrades: number;
  journal: number;
  exportedAt: number;
  /** Damaged trade records left out of the import. */
  skipped: number;
}

export interface ParsedImport {
  progress: ProgressState;
  settings: Partial<Settings>;
  simTrades: SimTrade[];
  journal: JournalTrade[];
  simBalance?: number;
  preview: ImportPreview;
}

export type ImportResult = { ok: true; data: ParsedImport } | { ok: false; error: string };

/** Parses the text of a backup file. Nothing is applied here — a failure changes no data. */
export function parseImport(text: string, now: number): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Это не JSON-файл. Выбери файл резервной копии курса (.json).' };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) {
    return { ok: false, error: 'Это не резервная копия этого курса.' };
  }
  if (!num(raw.schema) || raw.schema > BACKUP_SCHEMA) {
    return {
      ok: false,
      error: 'Копия сделана более новой версией сайта. Обнови страницу и попробуй снова.',
    };
  }
  if (!isObj(raw.progress)) {
    return { ok: false, error: 'В файле нет данных прогресса — похоже, он повреждён.' };
  }
  const rawSim = Array.isArray(raw.simTrades) ? raw.simTrades : [];
  const rawJournal = Array.isArray(raw.journal) ? raw.journal : [];
  const simTrades = rawSim.filter(isSimTrade);
  const journal = rawJournal.filter(isJournalTrade);
  const progress = migrateProgress(
    raw.progress,
    num(raw.progressVersion) ? raw.progressVersion : 0,
    now,
  );
  return {
    ok: true,
    data: {
      progress,
      settings: sanitizeSettings(raw.settings),
      simTrades,
      journal,
      ...(num(raw.simBalance) ? { simBalance: raw.simBalance } : {}),
      preview: {
        lessonsCompleted: Object.values(progress.lessons).filter(
          (l) => l?.completedAt !== undefined,
        ).length,
        xp: progress.xp,
        simTrades: simTrades.length,
        journal: journal.length,
        exportedAt: num(raw.exportedAt) ? raw.exportedAt : 0,
        skipped: rawSim.length - simTrades.length + rawJournal.length - journal.length,
      },
    },
  };
}
