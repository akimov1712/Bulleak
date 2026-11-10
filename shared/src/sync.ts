import { z } from 'zod';

/** Limits from docs/04-features/accounts-backend.md, section 5. */
export const PROGRESS_MAX_BYTES = 1_000_000;
export const SETTINGS_MAX_BYTES = 20_000;
export const RECORD_MAX_BYTES = 20_000;
export const RECORDS_MAX_PER_KIND = 20_000;
/** Changes per push and per pull page. */
export const RECORDS_PAGE = 500;

const jsonObject = z.record(z.string(), z.unknown());
const rev = z.number().int().min(0);

export const progressPutSchema = z.object({
  state: jsonObject,
  /** The `rev` this state was based on; 0 when the server had nothing yet. */
  baseRev: rev,
});
export type ProgressPut = z.infer<typeof progressPutSchema>;

/** GET answer and 409 answer: what the server has now. */
export const progressDocSchema = z.object({ state: jsonObject.nullable(), rev });
export type ProgressDoc = z.infer<typeof progressDocSchema>;

export const settingsPutSchema = z.object({ state: jsonObject });
export const settingsDocSchema = z.object({ state: jsonObject.nullable(), rev });
export type SettingsDoc = z.infer<typeof settingsDocSchema>;

export const RECORD_KINDS = ['sim', 'journal'] as const;
export type RecordKindName = (typeof RECORD_KINDS)[number];
export const recordKindSchema = z.enum(RECORD_KINDS);

export const recordChangeSchema = z.object({
  uid: z.uuid(),
  /** Client time of the change; the newer change of a record wins. */
  updatedAt: z.number().int().min(0),
  /** null — the record was deleted. */
  data: jsonObject.nullable(),
});
export type RecordChange = z.infer<typeof recordChangeSchema>;

export const recordsPushSchema = z.object({
  kind: recordKindSchema,
  changes: z.array(recordChangeSchema).max(RECORDS_PAGE),
});
export type RecordsPush = z.infer<typeof recordsPushSchema>;

export const recordsPushResultSchema = z.object({
  /** Records whose change the server kept (others had a newer change already). */
  applied: z.array(z.uuid()),
});

export const recordsPageSchema = z.object({
  changes: z.array(recordChangeSchema.extend({ rev })),
  /** Pass as `since` next time. */
  cursor: rev,
  /** More changes after this page. */
  more: z.boolean(),
});
export type RecordsPage = z.infer<typeof recordsPageSchema>;

/** Bytes of a value as JSON text (what the limits are about). */
export const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
