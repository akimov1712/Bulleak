# T-307 · Празднования: конфетти, level up, тосты достижений

- **Этап:** 03 Геймификация и карта пути
- **Статус:** ☑ выполнена

## Контекст (прочитать перед началом)

## Что сделать
1. Установить canvas-confetti
2. RewardsPresenter: слушает rewards и показывает конфетти (по звёздам), LevelUpModal, AchievementToast (редкость — цвет рамки)
3. Уважать reduced motion
4. Звуки через WebAudio (если включены)

## Файлы
- `src/features/gamification/RewardsPresenter.tsx`
- `LevelUpModal.tsx`
- `sound.ts`

## Критерии приёмки
- [x] При reduced motion нет конфетти и анимаций
- [x] Выполнен [Definition of Done](../../01-rules/definition-of-done.md)

**Коммит:** `feat(gamification): add celebrations and achievement toasts`
