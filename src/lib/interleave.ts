function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Inject a translated gloss list right after each English
 * `<ul class="glossary">...</ul>` block, in sense order -- the Nth match in
 * the rendered HTML is sense N+1, which lines up with glosses[N] since both
 * render-entry-html.py and propose-translations.py walk senses in the same
 * schema-v2 `ord` order. Silently leaves a sense alone if there's no
 * translation for it (shouldn't happen for entries this app queues, since
 * they were selected specifically for having zero senses in the target
 * language -- but a malformed draft shouldn't crash the context card).
 */
export function interleaveTranslation(html: string, glosses: string[][], langLabel: string): string {
  let senseIndex = 0
  return html.replace(/<ul class="glossary">.*?<\/ul>/gs, (match) => {
    const sense = glosses[senseIndex]
    senseIndex += 1
    if (!sense || sense.length === 0) return match
    const items = sense.map((g) => `<li class="gloss">${escapeHtml(g)}</li>`).join('')
    return `${match}<ul class="glossary glossary-translation" data-lang-label="${langLabel}" lang="fr">${items}</ul>`
  })
}
