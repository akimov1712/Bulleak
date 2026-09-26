import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type Loader = () => Promise<{ default: ComponentType }>;

/**
 * name → lazy loader. Every diagram is its own chunk so a lesson only downloads
 * the diagrams it uses. Names are referenced from MDX as <Diagram name="…" />.
 */
export const DIAGRAM_LOADERS: Record<string, Loader> = {};

export const isDiagramName = (name: string) => Object.hasOwn(DIAGRAM_LOADERS, name);

const cache = new Map<string, LazyExoticComponent<ComponentType>>();

/** Stable lazy component per name (lazy() must not be recreated on every render). */
export function diagramComponent(name: string): LazyExoticComponent<ComponentType> | null {
  const loader = DIAGRAM_LOADERS[name];
  if (!loader) return null;
  let component = cache.get(name);
  if (!component) {
    component = lazy(loader);
    cache.set(name, component);
  }
  return component;
}
