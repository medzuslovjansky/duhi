export interface Migrated {
  words: string[][];
  lemmas: string[][];
  redirects: string[][];
  issues: { kind: string; id: number; [key: string]: unknown }[];
}
export function migrate(rows: string[][], sameLemma?: string[]): Migrated;
export function lemmaKey(lemma: string): string;
export function splitTop(text: string): string[];
