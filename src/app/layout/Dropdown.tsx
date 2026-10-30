import { useId, useState, type ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  type Placement,
} from '@floating-ui/react';
import { cn } from '@/lib/cn';

export interface DropdownProps {
  /** Renders the trigger; spread `props` onto a <button>. */
  trigger: (props: Record<string, unknown>, open: boolean) => ReactNode;
  /** Panel content; call `close` after following a link. */
  children: (close: () => void) => ReactNode;
  placement?: Placement;
  /** Also open on hover (section menus), not only on click. */
  hover?: boolean;
  className?: string;
}

/**
 * Disclosure dropdown for the top bar: a button that shows a panel of links. The panel is
 * rendered right after the button (no portal) so Tab moves into it naturally.
 */
export function Dropdown({
  trigger,
  children,
  placement = 'bottom-start',
  hover = false,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Elements are tracked in state (not refs) so nothing ref-like is read during render.
  const [anchor, setAnchor] = useState<Element | null>(null);
  const [floating, setFloating] = useState<HTMLElement | null>(null);
  const { floatingStyles, context } = useFloating({
    elements: { reference: anchor, floating },
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    // With hover on, a click must not close the menu that hovering has just opened.
    useClick(context, { toggle: !hover }),
    useHover(context, {
      enabled: hover,
      delay: { open: 60, close: 120 },
      handleClose: safePolygon(),
    }),
    useDismiss(context),
  ]);
  const close = () => setOpen(false);

  return (
    <>
      {trigger(
        {
          ref: setAnchor,
          'aria-expanded': open,
          'aria-controls': open ? panelId : undefined,
          ...getReferenceProps(),
        },
        open,
      )}
      {open && (
        <div
          id={panelId}
          ref={setFloating}
          style={floatingStyles}
          className={cn(
            'z-40 animate-[pop-in_140ms_ease-out] rounded-(--radius-card) border border-border bg-surface p-2 text-text shadow-xl shadow-black/20',
            className,
          )}
          {...getFloatingProps()}
        >
          {children(close)}
        </div>
      )}
    </>
  );
}
