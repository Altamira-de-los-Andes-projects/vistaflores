import type { es } from './es';

// a wine as the site renders it: bundled fields plus what the CMS adds
type Wine = (typeof es)['wineCatalog'][number] & { docId?: string; line?: string; bottle?: string; background?: string; sheet?: string };
export type Copy = Omit<typeof es, 'wineCatalog'> & { wineCatalog: Wine[] };
