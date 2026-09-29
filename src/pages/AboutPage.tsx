import { Link } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/app/layout/PageHeader';
import { paths } from '@/app/paths';
import { Card } from '@/components/ui/Card';
import { MascotSay } from '@/components/mascot/MascotSay';
import { usePageTitle } from '@/hooks/usePageTitle';

const linkClass = 'font-bold text-info underline-offset-2 hover:underline';

export function AboutPage() {
  usePageTitle('О курсе');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="О курсе" subtitle="Bulleak · Трейдинг на Bybit с нуля" />

      <MascotSay mood="happy">
        Привет! Я Буллик. Мы пройдём путь от первой свечи до собственной свинг-стратегии — без
        обещаний лёгких денег, зато с практикой и честной статистикой.
      </MascotSay>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Что внутри</h2>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>13 модулей и 62 урока: от основ криптовалют до выхода на реальный счёт.</li>
          <li>Тест после каждого урока, экзамены модулей и финальный экзамен.</li>
          <li>Тренажёр на реальных исторических свечах Bybit, калькуляторы и журнал сделок.</li>
          <li>Опыт, уровни, стрики и достижения — чтобы учиться регулярно.</li>
          <li>
            Весь прогресс хранится только в этом браузере; делай резервные копии в настройках.
          </li>
        </ul>
      </Card>

      <Card className="flex flex-col gap-3 border-warn bg-warn-soft shadow-[0_4px_0_0_var(--warn)]">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-warn">
          <AlertTriangle className="size-6" aria-hidden="true" />
          Важно: риски
        </h2>
        <p>
          Материалы курса носят исключительно образовательный характер и не являются индивидуальной
          инвестиционной рекомендацией. Торговля криптовалютами, особенно с кредитным плечом,
          связана с высоким риском потери средств. Торгуй только теми деньгами, потерю которых
          можешь себе позволить. Прошлые результаты не гарантируют будущих.
        </p>
        <p>
          Курс не связан с биржей Bybit и не является её официальным материалом. Проверяй
          доступность сервисов и правила своей страны.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Источники и атрибуции</h2>
        <ul className="space-y-2 text-text-muted">
          <li>
            Исторические свечи — публичный API Bybit (
            <a
              className={linkClass}
              href="https://bybit-exchange.github.io/docs/v5/market/kline"
              target="_blank"
              rel="noreferrer"
            >
              документация
            </a>
            ).
          </li>
          <li>
            Графики построены с помощью{' '}
            <a
              className={linkClass}
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noreferrer"
            >
              TradingView
            </a>{' '}
            Lightweight Charts™ (лицензия Apache 2.0).
          </li>
          <li>Иконки — Lucide (ISC). Шрифты — Nunito и JetBrains Mono (SIL OFL).</li>
          <li>
            Иллюстрации, схемы и маскот нарисованы специально для курса. Источники фотографий
            перечислены в документации проекта.
          </li>
        </ul>
      </Card>

      <p className="text-center text-sm text-text-muted">
        Готов начать?{' '}
        <Link to={paths.path()} className={linkClass}>
          Открыть карту курса
        </Link>
      </p>
    </div>
  );
}
