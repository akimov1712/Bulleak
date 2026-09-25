import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  safePolygon,
  type Placement,
} from '@floating-ui/react';
import { cn } from '@/lib/cn';

export interface PopoverProps {
  /** A single element that accepts ref and event props (button, span with tabIndex…). */
  children: ReactElement;
  content: ReactNode;
  placement?: Placement;
  /** "click" for menus/definitions, "hover" also opens on hover/focus (tooltips, terms). */
  trigger?: 'click' | 'hover';
  className?: string;
  /** Accessible role of the floating element. */
  role?: 'dialog' | 'tooltip';
}

export function Popover({
  children,
  content,
  placement = 'top',
  trigger = 'click',
  className,
  role = 'dialog',
}: PopoverProps) {
  const [open, setOpen] = useState(false);
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

  const hoverMode = trigger === 'hover';
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useHover(context, {
      enabled: hoverMode,
      delay: { open: 120, close: 80 },
      handleClose: safePolygon(),
    }),
    useFocus(context, { enabled: hoverMode }),
    useDismiss(context),
    useRole(context, { role }),
  ]);

  if (!isValidElement(children)) return null;

  const reference = cloneElement(children, {
    ref: setAnchor,
    ...getReferenceProps(children.props as Record<string, unknown>),
  } as Record<string, unknown>);

  return (
    <>
      {reference}
      {open && (
        <FloatingPortal>
          <div
            ref={setFloating}
            style={floatingStyles}
            className={cn(
              'z-50 max-w-[min(20rem,calc(100vw-1rem))] rounded-2xl border-2 border-border bg-surface p-3.5 text-sm text-text shadow-xl',
              className,
            )}
            {...getFloatingProps()}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

/** Short hint on hover/focus. */
export function Tooltip({ children, text }: { children: ReactElement; text: string }) {
  return (
    <Popover
      trigger="hover"
      role="tooltip"
      content={text}
      className="px-2.5 py-1.5 text-xs font-bold"
    >
      {children}
    </Popover>
  );
}
