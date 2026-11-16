const COMMITS = 'https://github.com/medzuslovjansky/duhi/commit/';

/** The bot's profile text ("About Me") with its line about the running commit replaced. */
export function withRevision(description: string, sha: string): string {
  const rest = description
    .split('\n')
    .filter((line) => !line.includes(COMMITS))
    .join('\n')
    .trimEnd();

  return `${rest}\n\nVersija: ${COMMITS}${sha}`.trimStart();
}
