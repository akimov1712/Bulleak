import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Config } from './config';
import type { Logger } from './log';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Keeps letters in memory: for tests and local runs without a mail service. */
export function memoryMailer(logger?: Logger): Mailer & { sent: Mail[] } {
  const sent: Mail[] = [];
  return {
    sent,
    send: (mail) => {
      sent.push(mail);
      // Local runs need the link from the letter; production never uses this mailer.
      logger?.info('mail (not sent)', { subject: mail.subject, body: mail.text });
      return Promise.resolve();
    },
  };
}

/** Tests only: appends letters to a file as JSON lines, so e2e can open the links. */
export function fileMailer(path: string): Mailer {
  let folder: Promise<unknown> | null = null;
  return {
    send: async (mail) => {
      folder ??= mkdir(dirname(path), { recursive: true });
      await folder;
      await appendFile(path, `${JSON.stringify(mail)}\n`, 'utf8');
    },
  };
}

const RESEND_URL = 'https://api.resend.com/emails';

export function resendMailer(apiKey: string, from: string): Mailer {
  return {
    send: async ({ to, subject, text }) => {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text }),
      });
      if (!res.ok) throw new Error(`Resend answered ${res.status}`);
    },
  };
}

export function createMailer(config: Config, logger: Logger): Mailer {
  if (config.mail) return resendMailer(config.mail.apiKey, config.mail.from);
  return config.mailOutbox ? fileMailer(config.mailOutbox) : memoryMailer(logger);
}

export const verifyEmailMail = (to: string, link: string): Mail => ({
  to,
  subject: 'Подтверди e-mail в Bulleak',
  text: `Привет!\n\nЧтобы подтвердить e-mail, открой ссылку (действует 24 часа):\n${link}\n\nЕсли ты не регистрировался в Bulleak, просто удали это письмо.`,
});

export const resetPasswordMail = (to: string, link: string): Mail => ({
  to,
  subject: 'Сброс пароля в Bulleak',
  text: `Привет!\n\nЧтобы задать новый пароль, открой ссылку (действует 1 час):\n${link}\n\nЕсли ты не просил сброс, ничего делать не нужно: пароль останется прежним.`,
});
