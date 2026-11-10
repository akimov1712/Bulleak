import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config';
import { createMailer, fileMailer, verifyEmailMail } from './mail';
import { memoryLogger } from './log';

let dir = '';
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe('fileMailer', () => {
  it('appends letters as JSON lines, creating the folder', async () => {
    dir = await mkdtemp(join(tmpdir(), 'bulleak-mail-'));
    const path = join(dir, 'nested', 'outbox.jsonl');
    const mailer = fileMailer(path);
    await mailer.send(verifyEmailMail('a@mail.test', 'https://x.test/#/verify?token=t1'));
    await mailer.send(verifyEmailMail('b@mail.test', 'https://x.test/#/verify?token=t2'));
    const lines = (await readFile(path, 'utf8')).trim().split('\n');
    expect(lines.map((l) => (JSON.parse(l) as { to: string }).to)).toEqual([
      'a@mail.test',
      'b@mail.test',
    ]);
  });

  it('is chosen by MAIL_OUTBOX when there is no mail service', async () => {
    dir = await mkdtemp(join(tmpdir(), 'bulleak-mail-'));
    const path = join(dir, 'outbox.jsonl');
    const mailer = createMailer(loadConfig({ MAIL_OUTBOX: path }), memoryLogger());
    await mailer.send(verifyEmailMail('a@mail.test', 'link'));
    expect(await readFile(path, 'utf8')).toContain('a@mail.test');
  });
});
