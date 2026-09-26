import { CALCULATORS } from './registry';

/** Lesson block: an interactive calculator by id (see registry.ts). */
export function CalcEmbed({ id }: { id: string }) {
  const Calc = CALCULATORS[id];
  if (!Calc) {
    return (
      <p
        role="alert"
        className="my-6 rounded-2xl border-2 border-dashed border-warn p-4 text-center text-sm text-warn"
      >
        Калькулятор «{id}» не найден
      </p>
    );
  }
  return (
    <div className="my-6">
      <Calc />
    </div>
  );
}
