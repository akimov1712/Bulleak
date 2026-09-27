/** Side-effectful data operations of the settings page: export, import, reset. */
import { db, guard } from '@/db/db';
import { journalRepo } from '@/db/journalRepo';
import { simRepo } from '@/db/simRepo';
import { backupFileName, buildExport, type ParsedImport } from '@/lib/io/backup';
import { SIM_BALANCE_KEY } from '@/lib/trading/simPlan';
import { selectProgressData, useProgress } from '@/store/progressStore';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore';
import type { Settings } from '@/types/settings';

/** Every key the app writes starts with this prefix. */
const KEY_PREFIX = 'tc-';

function readSimBalance(): number | undefined {
  try {
    const raw = localStorage.getItem(SIM_BALANCE_KEY);
    const value: unknown = raw === null ? undefined : JSON.parse(raw);
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function currentSettings(): Settings {
  const s = useSettings.getState();
  return {
    theme: s.theme,
    sound: s.sound,
    dailyGoalXp: s.dailyGoalXp,
    freeMode: s.freeMode,
    reducedMotion: s.reducedMotion,
  };
}

/** Builds the backup and hands it to the browser as a file download. */
export async function downloadBackup(now = Date.now()): Promise<void> {
  const file = buildExport({
    progress: selectProgressData(useProgress.getState()),
    settings: currentSettings(),
    simTrades: await simRepo.list(),
    journal: await journalRepo.list(),
    simBalance: readSimBalance(),
    now,
  });
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Replaces everything with the imported data. The trade tables go first: if IndexedDB fails,
 * the progress in localStorage is left untouched.
 */
export async function applyImport(data: ParsedImport): Promise<void> {
  await simRepo.replaceAll(data.simTrades);
  await journalRepo.replaceAll(data.journal);
  useProgress.setState(data.progress);
  useSettings.setState({ ...DEFAULT_SETTINGS, ...data.settings });
  try {
    if (data.simBalance === undefined) localStorage.removeItem(SIM_BALANCE_KEY);
    else localStorage.setItem(SIM_BALANCE_KEY, JSON.stringify(data.simBalance));
  } catch {
    // storage unavailable: the balance resets to the default, everything else is restored
  }
}

/** Deletes all progress, trades, settings and remembered inputs of this site. */
export async function resetAll(): Promise<void> {
  await guard('очистить сделки', () =>
    db.transaction('rw', db.simTrades, db.journal, async () => {
      await db.simTrades.clear();
      await db.journal.clear();
    }),
  );
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    for (const key of keys) if (key?.startsWith(KEY_PREFIX)) localStorage.removeItem(key);
  } catch {
    // nothing stored
  }
}

/** Rough size of the data kept by the site (localStorage text + trade records). */
export async function storageSummary(): Promise<{
  localKb: number;
  simTrades: number;
  journal: number;
}> {
  let chars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX))
        chars += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
  } catch {
    // unavailable
  }
  const [simTrades, journal] = await Promise.all([
    simRepo.count().catch(() => 0),
    journalRepo.count().catch(() => 0),
  ]);
  return { localKb: (chars * 2) / 1024, simTrades, journal };
}
