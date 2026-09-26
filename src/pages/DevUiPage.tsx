import { useState, type ReactNode } from 'react';
import { Flame, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import { Badge, Pill } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Tabs } from '@/components/ui/Tabs';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { Popover, Tooltip } from '@/components/ui/Popover';
import { EmptyState, Skeleton } from '@/components/ui/Skeleton';
import { Mascot } from '@/components/mascot/Mascot';
import { MascotSay } from '@/components/mascot/MascotSay';
import { MOOD_LIST, MOODS } from '@/components/mascot/moods';
import { toast } from '@/store/uiStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatUsd } from '@/lib/format';
import { CandleChart, type ChartPick } from '@/features/charts/CandleChart';
import { Diagram } from '@/components/diagrams/Diagram';
import { DIAGRAM_LOADERS } from '@/components/diagrams/registry';
import { QuestionView } from '@/features/quiz/QuestionView';
import type { QuestionState } from '@/features/quiz/questions/types';
import { gradeQuestion } from '@/lib/quiz/grade';
import { isAnswered } from '@/lib/quiz/describe';
import type { ChartClickQuestion } from '@/types/quiz';

const SWATCHES = [
  'bg',
  'surface',
  'surface-2',
  'border',
  'text',
  'text-muted',
  'primary',
  'bull',
  'bear',
  'xp',
  'info',
  'epic',
  'warn',
  'mod-green',
  'mod-blue',
  'mod-purple',
  'mod-orange',
  'mod-pink',
  'mod-teal',
  'mod-yellow',
  'mod-red',
] as const;

const DEMO_QUESTIONS: ChartClickQuestion[] = [
  {
    id: 'demo-price',
    type: 'chart-click',
    prompt: 'Кликни по уровню поддержки',
    explanation: '',
    tags: [],
    dataset: 'BTCUSDT-240',
    from: 2880,
    to: 2999,
    target: { kind: 'price', min: 74500, max: 76500 },
  },
  {
    id: 'demo-candle',
    type: 'chart-click',
    prompt: 'Выбери свечу с самым низким минимумом',
    explanation: '',
    tags: [],
    dataset: 'BTCUSDT-240',
    from: 2880,
    to: 2999,
    target: { kind: 'candle', indices: [2940] },
  },
];

function DemoChartQuestion({ question }: { question: ChartClickQuestion }) {
  const [value, setValue] = useState<unknown>();
  const [state, setState] = useState<QuestionState>('answering');
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="font-bold">{question.prompt}</p>
      <QuestionView question={question} value={value} onChange={setValue} state={state} />
      <Button
        disabled={state === 'answering' && !isAnswered(question, value)}
        onClick={() =>
          state === 'answering'
            ? setState(gradeQuestion(question, value) ? 'correct' : 'wrong')
            : (setState('answering'), setValue(undefined))
        }
      >
        {state === 'answering'
          ? 'Проверить'
          : state === 'correct'
            ? 'Верно! Ещё раз'
            : 'Неверно. Ещё раз'}
      </Button>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

/** Dev-only showcase of the UI kit (route exists only in `vite dev`). */
export function DevUiPage() {
  usePageTitle('UI-кит');
  const [tab, setTab] = useState<'learn' | 'sim' | 'journal'>('learn');
  const [deposit, setDeposit] = useState<number | null>(1000);
  const [goal, setGoal] = useState<'20' | '50' | '100'>('50');
  const [sound, setSound] = useState(false);
  const [modal, setModal] = useState<'center' | 'sheet' | null>(null);
  const [pill, setPill] = useState('risk');
  const [pick, setPick] = useState<ChartPick | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="UI-кит" subtitle="Витрина компонентов (только в dev)" />

      <Section title="Схемы">
        <div className="flex max-w-2xl flex-col gap-6">
          {Object.keys(DIAGRAM_LOADERS).map((name) => (
            <Diagram key={name} name={name} caption={name} />
          ))}
        </div>
      </Section>

      <Section title="Графики">
        <CandleChart
          dataset="BTCUSDT-240"
          to="2026-09-25T12:00Z"
          bars={120}
          volume
          indicators={[
            { type: 'ema', period: 20 },
            { type: 'ema', period: 50 },
          ]}
          annotations={[
            { type: 'swings', n: 4 },
            { type: 'hline', price: 80000, label: 'Уровень 80k', dashed: true },
            { type: 'zone', top: 76500, bottom: 74900, label: 'Зона спроса', tone: 'bull' },
            { type: 'vline', time: '2026-09-15T16:00Z', label: 'Событие' },
          ]}
          caption="BTC 4H: свинги HH/HL, уровень, зона, EMA 20/50"
        />
        <CandleChart
          dataset="ETHUSDT-D"
          bars={150}
          interactive
          height={280}
          indicators={[{ type: 'bollinger' }, { type: 'rsi' }, { type: 'macd' }]}
          onPick={setPick}
          caption={
            pick
              ? `Клик: свеча #${pick.index}, цена ${pick.price.toFixed(2)}`
              : 'ETH 1D: Bollinger, RSI, MACD. Кликни по графику'
          }
        />
      </Section>

      <Section title="Вопросы с кликом по графику">
        {DEMO_QUESTIONS.map((q) => (
          <DemoChartQuestion key={q.id} question={q} />
        ))}
      </Section>

      <Section title="Цвета">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
          {SWATCHES.map((name) => (
            <div key={name} className="flex flex-col gap-1 text-xs font-bold text-text-muted">
              <span
                className="h-12 rounded-xl border-2 border-border"
                style={{ background: `var(--${name})` }}
              />
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Кнопки">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Начать урок</Button>
          <Button variant="secondary">Назад</Button>
          <Button variant="ghost">Пропустить</Button>
          <Button variant="danger" leftIcon={<Trash2 className="size-5" />}>
            Удалить
          </Button>
          <Button variant="xp" leftIcon={<Flame className="size-5" />}>
            +50 XP
          </Button>
          <Button loading>Сохраняю</Button>
          <Button disabled>Недоступно</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Маленькая</Button>
          <Button size="lg">Большая</Button>
          <IconButton label="Добавить" icon={<Plus className="size-5" />} variant="surface" />
        </div>
        <Button fullWidth size="lg">
          Проверить
        </Button>
      </Section>

      <Section title="Бейджи и фильтры">
        <div className="flex flex-wrap gap-2">
          <Badge>Нейтральный</Badge>
          <Badge tone="bull" numeric>
            +1,5R
          </Badge>
          <Badge tone="bear" numeric>
            −1R
          </Badge>
          <Badge tone="xp">+25 XP</Badge>
          <Badge tone="info">Совет</Badge>
          <Badge tone="epic">Эпическое</Badge>
          <Badge tone="warn" size="md">
            Риск
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['risk', 'Риск'],
            ['chart', 'График'],
            ['psy', 'Психология'],
          ].map(([id, label]) => (
            <Pill key={id} selected={pill === id} onClick={() => setPill(id as string)}>
              {label}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Карточки и прогресс">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="font-extrabold">Модуль 3 · Чтение графика</p>
            <p className="mb-3 text-sm text-text-muted">3 из 5 уроков</p>
            <ProgressBar label="Прогресс модуля" value={0.6} valueText="3 из 5" />
          </Card>
          <Card interactive className="flex items-center gap-4">
            <ProgressRing label="Цель дня" value={0.7} tone="xp">
              <span className="font-mono font-extrabold">35/50</span>
            </ProgressRing>
            <div>
              <p className="font-extrabold">Цель дня</p>
              <p className="text-sm text-text-muted">Ещё 15 XP</p>
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-2">
          <ProgressBar label="xp" value={0.35} tone="xp" size="lg" />
          <ProgressBar label="epic" value={0.8} tone="epic" size="sm" />
          <ProgressBar label="bear" value={0.2} tone="bear" />
        </div>
      </Section>

      <Section title="Вкладки и формы">
        <Tabs
          label="Статистика"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'learn', label: 'Обучение' },
            { id: 'sim', label: 'Тренажёр' },
            { id: 'journal', label: 'Журнал' },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Депозит" hint={`Сейчас: ${formatUsd(deposit)}`}>
            {({ id, describedBy }) => (
              <NumberInput
                id={id}
                aria-describedby={describedBy}
                value={deposit}
                onValueChange={setDeposit}
                unit="$"
                min={0}
              />
            )}
          </Field>
          <Field label="Стоп-лосс" error="Стоп должен быть ниже цены входа">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                defaultValue="61 000"
              />
            )}
          </Field>
          <Field label="Цель дня">
            {({ id }) => (
              <Select
                id={id}
                value={goal}
                onValueChange={setGoal}
                options={[
                  { value: '20', label: '20 XP — лёгкий темп' },
                  { value: '50', label: '50 XP — обычный' },
                  { value: '100', label: '100 XP — интенсив' },
                ]}
              />
            )}
          </Field>
          <Switch
            checked={sound}
            onCheckedChange={setSound}
            label="Звуки"
            description="Короткие сигналы при ответах"
          />
        </div>
      </Section>

      <Section title="Оверлеи и уведомления">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModal('center')}>
            Модалка
          </Button>
          <Button variant="secondary" onClick={() => setModal('sheet')}>
            Нижний лист
          </Button>
          <Popover
            content={
              <p>
                <b>Плечо</b> — отношение размера позиции к марже. Не меняет риск, если размер
                позиции рассчитан по стопу.
              </p>
            }
          >
            <Button variant="secondary">Поповер</Button>
          </Popover>
          <Tooltip text="Подсказка при наведении">
            <Button variant="ghost">Тултип</Button>
          </Tooltip>
          <Button
            variant="xp"
            onClick={() =>
              toast({ tone: 'xp', icon: '⚡', title: '+50 XP', description: 'Тест сдан!' })
            }
          >
            Тост XP
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                tone: 'achievement',
                icon: '🏆',
                title: 'Достижение: Первый шаг',
                description: 'Прочитан первый урок',
              })
            }
          >
            Тост достижения
          </Button>
          <Button
            variant="danger"
            onClick={() => toast({ tone: 'error', title: 'Не удалось сохранить' })}
          >
            Тост ошибки
          </Button>
        </div>
        <Modal
          open={modal !== null}
          onClose={() => setModal(null)}
          title="Сбросить прогресс?"
          variant={modal ?? 'center'}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(null)}>
                Отмена
              </Button>
              <Button variant="danger" onClick={() => setModal(null)}>
                Сбросить
              </Button>
            </>
          }
        >
          <p className="text-text-muted">
            Все уроки, XP и достижения будут удалены. Это действие нельзя отменить.
          </p>
        </Modal>
      </Section>

      <Section title="Пустые состояния и загрузка">
        <EmptyState
          art={<Mascot mood="sleeping" size={120} />}
          title="Сделок пока нет"
          description="Добавь первую сделку с демо-счёта, чтобы увидеть статистику."
          action={<Button>Добавить сделку</Button>}
        />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Section>

      <Section title="Маскот">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {MOOD_LIST.map((mood) => (
            <figure key={mood} className="flex flex-col items-center gap-1 text-center">
              <Mascot mood={mood} size={110} />
              <figcaption className="text-xs text-text-muted">{MOODS[mood].label}</figcaption>
            </figure>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <Mascot mood="happy" size={48} />
          <Mascot mood="happy" size={96} />
          <Mascot mood="cheering" size={200} />
        </div>
        <MascotSay mood="pointing">Начни с первого урока — это займёт 8 минут!</MascotSay>
        <MascotSay mood="sad" layout="stack">
          Не расстраивайся: 7 из 10 — почти получилось. Повтори урок и попробуй снова.
        </MascotSay>
      </Section>
    </div>
  );
}
