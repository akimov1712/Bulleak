import type { ModuleColor } from '@/types/course';

/** Literal class names per module color (Tailwind needs to see full class strings). */
export const moduleColors: Record<
  ModuleColor,
  { bg: string; border: string; text: string; shadow: string; ring: string }
> = {
  green: {
    bg: 'bg-mod-green',
    border: 'border-mod-green',
    text: 'text-mod-green',
    shadow: 'shadow-[0_4px_0_0_var(--mod-green-shade)]',
    ring: 'ring-mod-green',
  },
  blue: {
    bg: 'bg-mod-blue',
    border: 'border-mod-blue',
    text: 'text-mod-blue',
    shadow: 'shadow-[0_4px_0_0_var(--mod-blue-shade)]',
    ring: 'ring-mod-blue',
  },
  purple: {
    bg: 'bg-mod-purple',
    border: 'border-mod-purple',
    text: 'text-mod-purple',
    shadow: 'shadow-[0_4px_0_0_var(--mod-purple-shade)]',
    ring: 'ring-mod-purple',
  },
  orange: {
    bg: 'bg-mod-orange',
    border: 'border-mod-orange',
    text: 'text-mod-orange',
    shadow: 'shadow-[0_4px_0_0_var(--mod-orange-shade)]',
    ring: 'ring-mod-orange',
  },
  pink: {
    bg: 'bg-mod-pink',
    border: 'border-mod-pink',
    text: 'text-mod-pink',
    shadow: 'shadow-[0_4px_0_0_var(--mod-pink-shade)]',
    ring: 'ring-mod-pink',
  },
  teal: {
    bg: 'bg-mod-teal',
    border: 'border-mod-teal',
    text: 'text-mod-teal',
    shadow: 'shadow-[0_4px_0_0_var(--mod-teal-shade)]',
    ring: 'ring-mod-teal',
  },
  yellow: {
    bg: 'bg-mod-yellow',
    border: 'border-mod-yellow',
    text: 'text-mod-yellow',
    shadow: 'shadow-[0_4px_0_0_var(--mod-yellow-shade)]',
    ring: 'ring-mod-yellow',
  },
  red: {
    bg: 'bg-mod-red',
    border: 'border-mod-red',
    text: 'text-mod-red',
    shadow: 'shadow-[0_4px_0_0_var(--mod-red-shade)]',
    ring: 'ring-mod-red',
  },
};
