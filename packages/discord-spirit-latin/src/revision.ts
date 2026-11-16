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

/** The card the bot posts when pinged with nothing else: which commit runs, from when, and the CI run behind it. */
export function revisionEmbed(sha: string | undefined, commitTime: string | undefined, runUrl?: string) {
  return {
    title: 'Duh Latinice',
    fields: [
      { name: 'Versija', value: sha ? `[${sha.slice(0, 7)}](${COMMITS}${sha})` : 'lokalna', inline: true },
      ...(commitTime ? [{ name: 'Data', value: `<t:${commitTime}:f> (<t:${commitTime}:R>)`, inline: true }] : []),
      ...(runUrl ? [{ name: 'Sostavjenje', value: `[GitHub Actions](${runUrl})`, inline: true }] : []),
    ],
  };
}
