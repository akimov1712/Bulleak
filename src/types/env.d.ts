interface ImportMetaEnv {
  /** Base address of the API, e.g. https://bulleak.ru/api/v1; empty — guest-only build. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
