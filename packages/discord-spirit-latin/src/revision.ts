const LABEL = 'Verzija: ';

/** The bot's profile text ("About Me") with its line about the running commit replaced. */
export function withRevision(description: string, sha: string): string {
  const rest = description
    .split('\n')
    .filter((line) => !line.startsWith(LABEL))
    .join('\n')
    .trimEnd();

  return `${rest}\n\n${LABEL}https://github.com/medzuslovjansky/duhi/commit/${sha}`.trimStart();
}
