import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Download, Printer } from 'lucide-react';
import { paths } from '@/app/paths';
import { PageHeader } from '@/app/layout/PageHeader';
import { Mascot } from '@/components/mascot/Mascot';
import { LogoMark } from '@/components/brand/LogoMark';
import { BRAND } from '@/app/brand';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/Skeleton';
import { buttonClass } from '@/components/ui/styles';
import { usePageTitle } from '@/hooks/usePageTitle';
import { certificateData } from '@/lib/certificate';
import { formatNumber, formatPct } from '@/lib/format';
import { useProgress } from '@/store/progressStore';
import { toast } from '@/store/uiStore';

const COURSE_TITLE = BRAND.tagline;
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * /certificate: the course certificate after the final exam. Always in a light style (fixed
 * colours, not theme tokens) so the PNG and the print look the same in both themes.
 */
export function CertificatePage() {
  usePageTitle('Сертификат');
  const exams = useProgress((s) => s.exams);
  const profile = useProgress((s) => s.profile);
  const xp = useProgress((s) => s.xp);
  const lessons = useProgress((s) => s.lessons);
  const setName = useProgress((s) => s.setName);
  const [draft, setDraft] = useState(profile.name);
  const [saving, setSaving] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const data = certificateData({ exams, profile, xp, lessons });

  if (!data) {
    return (
      <EmptyState
        headingLevel={1}
        art={<Mascot mood="sleeping" size={130} />}
        title="Сертификат пока не получен"
        description="Сертификат откроется после сдачи финального экзамена."
        action={
          <Link to={paths.finalExam()} className={buttonClass()}>
            К финальному экзамену
          </Link>
        }
      />
    );
  }

  const downloadPng = async () => {
    if (!card.current) return;
    setSaving(true);
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(card.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${data.code}.png`;
      link.click();
    } catch {
      toast({
        tone: 'error',
        title: 'Не удалось сохранить картинку',
        description: 'Попробуй печать в PDF.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="Сертификат"
        subtitle="Награда за прохождение курса"
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              variant="secondary"
              leftIcon={<Download className="size-5" aria-hidden="true" />}
              disabled={saving}
              onClick={() => void downloadPng()}
            >
              Скачать PNG
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Printer className="size-5" aria-hidden="true" />}
              onClick={() => window.print()}
            >
              Печать
            </Button>
          </div>
        }
      />
      <Card className="flex flex-wrap items-end gap-3 print:hidden">
        <Field label="Имя на сертификате" className="min-w-0 flex-1">
          {({ id }) => (
            <Input
              id={id}
              value={draft}
              maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}
        </Field>
        <Button disabled={draft.trim() === profile.name.trim()} onClick={() => setName(draft)}>
          Сохранить имя
        </Button>
      </Card>

      <div
        ref={card}
        data-testid="certificate"
        className="relative overflow-hidden rounded-3xl border-4 p-6 text-center sm:p-10"
        style={{ background: '#fffdf5', borderColor: '#f5b400', color: '#1f2433' }}
      >
        <p className="mb-4 flex items-center justify-center gap-2 text-xl font-black tracking-[-0.035em]">
          <LogoMark size={32} />
          <span>
            <span style={{ color: '#0a7f41' }}>{BRAND.name.slice(0, 4)}</span>
            {BRAND.name.slice(4)}
          </span>
        </p>
        <p
          className="text-sm font-extrabold tracking-[0.2em] uppercase"
          style={{ color: '#8a6d00' }}
        >
          Сертификат
        </p>
        <p className="mt-2 text-lg font-bold" style={{ color: '#5b6275' }}>
          подтверждает, что
        </p>
        <p className="mt-2 text-3xl font-extrabold break-words sm:text-4xl">{data.name}</p>
        <p className="mt-3 text-lg font-bold" style={{ color: '#5b6275' }}>
          прошёл(а) курс
        </p>
        <p className="mt-1 text-2xl font-extrabold">«{COURSE_TITLE}»</p>
        <div className="mx-auto my-4 w-fit">
          <Mascot mood="cheering" size={110} />
        </div>
        <dl className="mx-auto grid max-w-xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
          {(
            [
              ['Дата', dateFormat.format(data.issuedAt)],
              ['Финальный экзамен', formatPct(data.score, 0)],
              ['Уровень', `${data.level} · ${data.rank}`],
              ['Время в уроках', `${formatNumber(data.hours, 1)} ч`],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-2xl p-2" style={{ background: '#fff4c7' }}>
              <dt className="text-xs font-bold" style={{ color: '#5b6275' }}>
                {label}
              </dt>
              <dd className="font-extrabold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 font-mono text-sm font-bold" style={{ color: '#5b6275' }}>
          Код: {data.code}
        </p>
        <p className="mt-3 text-xs" style={{ color: '#5b6275' }}>
          Сертификат подтверждает прохождение персонального учебного курса и не является
          квалификационным документом.
        </p>
      </div>
    </div>
  );
}
