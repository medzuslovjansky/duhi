// Renders a message payload as HTML with @skyra/discord-components-core (Discord's own
// renderer is not public). Supports what src/render/embed.ts emits: embeds, buttons, a select.

import type { Payload } from '../src/render/embed.ts';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The Markdown subset the renderer writes: code blocks, code, bold, italic, links, escaped asterisks. */
function markdown(text: string): string {
  return text
    .split(/```\n?/)
    .map((part, i) => {
      if (i % 2 === 1) return `<discord-code multiline>${escape(part.replace(/\n$/, ''))}</discord-code>`;
      return escape(part)
        .replace(/`([^`]+)`/g, '<discord-code>$1</discord-code>')
        .replace(/\*\*([^*]+)\*\*/g, '<discord-bold>$1</discord-bold>')
        .replace(/(^|[^\\])\*([^*\n]+)\*/g, '$1<discord-italic>$2</discord-italic>')
        .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<discord-link href="$2">$1</discord-link>')
        .replace(/\\\*/g, '*')
        .replace(/\n/g, '<br>');
    })
    .join('');
}

export function html(payload: Payload, script: string, ephemeral = true): string {
  const embeds = payload.embeds
    .map(
      (e) => `<discord-embed slot="embeds" color="#5865F2"${e.title ? ` embed-title="${escape(e.title)}"` : ''}${e.url ? ` url="${escape(e.url)}"` : ''}>
  ${e.description ? `<discord-embed-description slot="description">${markdown(e.description)}</discord-embed-description>` : ''}
  ${
    e.fields?.length
      ? `<discord-embed-fields slot="fields">${e.fields
          .map((f, i, all) => {
            // Discord puts up to three inline fields in a row; the component needs their position.
            let run = 0;
            for (let j = i; j >= 0 && all[j].inline; j--) run++;
            const position = f.inline ? ` inline inline-index="${((run - 1) % 3) + 1}"` : '';
            return `<discord-embed-field field-title="${escape(f.name)}"${position}>${markdown(f.value)}</discord-embed-field>`;
          })
          .join('')}</discord-embed-fields>`
      : ''
  }
  ${e.footer ? `<discord-embed-footer slot="footer">${escape(e.footer.text)}</discord-embed-footer>` : ''}
</discord-embed>`,
    )
    .join('\n');

  const rows = payload.components
    .map(
      (row) =>
        `<discord-action-row>${row.components
          .map((c) =>
            c.type === 2
              ? `<discord-button type="secondary">${escape(String(c.label))}</discord-button>`
              : `<discord-string-select-menu>${(c.options as { label: string }[])
                  .map((o) => `<discord-string-select-menu-option label="${escape(o.label)}"></discord-string-select-menu-option>`)
                  .join('')}</discord-string-select-menu>`,
          )
          .join('')}</discord-action-row>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><script type="module">${script}</script>
<style>body { margin: 0; background: #313338; }</style></head><body>
<discord-messages>
  <discord-message author="Duh Slova" timestamp="2026-01-01T12:00:00Z" bot${ephemeral ? ' ephemeral' : ''}>
    ${payload.content ? markdown(payload.content) : ''}
    ${embeds}
    ${rows ? `<discord-attachments slot="components">${rows}</discord-attachments>` : ''}
  </discord-message>
</discord-messages></body></html>`;
}
