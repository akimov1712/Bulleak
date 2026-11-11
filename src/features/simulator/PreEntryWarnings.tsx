import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DISCIPLINE_RULES, type RuleId } from '@/lib/discipline/rules';

/** Rules the order would break: fix it or open anyway (the simulator teaches, not forbids). */
export function PreEntryWarnings({
  rules,
  onFix,
  onOpenAnyway,
}: {
  rules: RuleId[] | null;
  onFix: () => void;
  onOpenAnyway: () => void;
}) {
  return (
    <Modal
      open={rules !== null}
      onClose={onFix}
      title="Сделка нарушает правила"
      size="sm"
      footer={
        <>
          <Button onClick={onFix}>Исправить</Button>
          <Button variant="secondary" onClick={onOpenAnyway}>
            Всё равно открыть
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {(rules ?? []).map((id) => (
          <li key={id} className="flex gap-2">
            <AlertTriangle className="size-5 shrink-0 text-warn" aria-hidden="true" />
            {DISCIPLINE_RULES.find((r) => r.id === id)?.title ?? id}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-text-muted">
        Открыть можно — но нарушение попадёт в статистику дисциплины.
      </p>
    </Modal>
  );
}
