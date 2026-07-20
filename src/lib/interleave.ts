/**
 * Mark a slot right after each English `<ul class="glossary">...</ul>` block,
 * in sense order -- the Nth match in the rendered HTML is sense N+1, which
 * lines up with glosses[N] since both render-entry-html.py and
 * propose-translations.py walk senses in the same schema-v2 `ord` order.
 * ContextCard replaces each slot with a real, live-editable <input> after
 * the HTML lands in the DOM (can't do that here -- this only touches the
 * HTML string, before anything is actually rendered).
 */
export function markTranslationSlots(html: string): string {
  let senseIndex = 0
  return html.replace(/<ul class="glossary">[\s\S]*?<\/ul>/g, (match) => {
    const slot = `<span class="translation-slot" data-sense-index="${senseIndex}"></span>`
    senseIndex += 1
    return `${match}${slot}`
  })
}
