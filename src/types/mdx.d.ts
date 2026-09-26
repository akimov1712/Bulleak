/** Direct `import X from './file.mdx'` (test fixtures; lessons load via import.meta.glob). */
declare module '*.mdx' {
  import type { MDXContent } from 'mdx/types';

  const Content: MDXContent;
  export default Content;
}
