declare namespace React {
  type ReactNode = any;
  type CSSProperties = Record<string, string | number | undefined>;
}

declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any; }
  interface IntrinsicAttributes { key?: string | number; }
}

declare module 'react' {
  export function useState<T = undefined>(initial?: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void];
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  const React: { StrictMode: any };
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export function createRoot(container: Element): { render(children: any): void };
}

declare module 'lucide-react' {
  export const Archive: any;
  export const BadgeDollarSign: any;
  export const BellRing: any;
  export const CheckCircle2: any;
  export const Clock3: any;
  export const Copy: any;
  export const Gamepad2: any;
  export const GitBranch: any;
  export const Layers3: any;
  export const MonitorSmartphone: any;
  export const Palette: any;
  export const RotateCcw: any;
  export const Save: any;
  export const Sparkles: any;
  export const Split: any;
  export const Upload: any;
  export const Wand2: any;
}

declare module '*.css';
