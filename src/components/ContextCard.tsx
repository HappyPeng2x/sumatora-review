import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { fetchText, rawUrl, RENDER_REPO, RENDER_REF } from '../lib/github'
import { markTranslationSlots } from '../lib/interleave'
import { DARK_OVERRIDES } from '../lib/contextCardOverrides'

let cssCache: Promise<string> | null = null

function getCss(): Promise<string> {
  if (!cssCache) {
    cssCache = Promise.all([
      fetchText(rawUrl(RENDER_REPO, RENDER_REF, 'common.css')),
      fetchText(rawUrl(RENDER_REPO, RENDER_REF, 'jitendex.css')),
    ]).then(([common, jitendex]) => `${common}\n${jitendex}\n${DARK_OVERRIDES}`)
  }
  return cssCache
}

interface Props {
  seq: number
  /** Context language rendered by gitenderml (English tags/restrictions/examples). */
  contextLang?: string
  /** Current draft glosses, one array per sense -- used only to seed each
   * input's initial value; typing doesn't flow back into this prop, see the
   * shadow-DOM effect below for why. */
  glosses: string[][]
  onChangeSense: (senseIndex: number, glosses: string[]) => void
}

export interface ContextCardHandle {
  /** Imperatively set a sense's visible input value (e.g. "use this Gemini
   * suggestion") -- has to go through the real DOM input, not the `glosses`
   * prop, since these inputs are deliberately uncontrolled (see below); this
   * dispatches the same 'input' event a keystroke would, so it flows through
   * the existing onChangeSense wiring instead of duplicating that parsing. */
  setSenseValue: (senseIndex: number, text: string) => void
}

/**
 * Renders gitenderml's pre-rendered Jitendex-styled entry card for full
 * context (headword+furigana, every English sense with tags/restrictions,
 * linked examples, forms table), with a live-editable input for the AI
 * draft inserted directly after each English sense's gloss -- not a
 * separate read-only preview or a side panel, the actual editing surface
 * lives right next to the thing it's a translation of.
 *
 * This can't be an iframe (the previous approach): a sandboxed iframe is a
 * separate document, and React in the parent has no way to host live,
 * stateful <input> elements inside another document's DOM. Instead this
 * renders into a shadow root attached to a plain div -- real DOM, so
 * native <input> elements work normally, but jitendex.css/common.css's
 * fairly generic selectors (`a`, `table`, `.sense`, ...) stay fully
 * contained and can never leak into the rest of this app's styling.
 */
export const ContextCard = forwardRef<ContextCardHandle, Props>(function ContextCard(
  { seq, contextLang = 'eng', glosses, onChangeSense },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [articleHtml, setArticleHtml] = useState<string | null>(null)
  const [css, setCss] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Read via a ref inside the DOM-building effect below, instead of as a
  // normal dependency, so a keystroke (which updates `glosses` in the
  // parent) never re-triggers the effect that tears down and rebuilds the
  // shadow tree -- that would blow away focus and cursor position mid-type.
  // The ref is still always current, so if the fetch below resolves before
  // the parent's own glosses fetch does, the slot-filling effect (which
  // depends on articleHtml/css, not glosses) reads whatever's latest at the
  // moment it actually runs rather than a stale closure.
  const glossesRef = useRef(glosses)
  glossesRef.current = glosses
  const onChangeSenseRef = useRef(onChangeSense)
  onChangeSenseRef.current = onChangeSense

  useEffect(() => {
    let cancelled = false
    setArticleHtml(null)
    setError(null)
    const shard = Math.floor(seq / 10000)
    const path = `${contextLang}/${shard}/${seq}.html`
    Promise.all([fetchText(rawUrl(RENDER_REPO, RENDER_REF, path)), getCss()])
      .then(([html, cssText]) => {
        if (cancelled) return
        const bodyMatch = html.match(/<article class="sumatora-entry">[\s\S]*<\/article>/)
        const article = bodyMatch ? bodyMatch[0] : html
        setArticleHtml(markTranslationSlots(article))
        setCss(cssText)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [seq, contextLang])

  useEffect(() => {
    const host = hostRef.current
    if (!host || articleHtml == null || css == null) return

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `<style>${css}</style>${articleHtml}`

    const cleanups: (() => void)[] = []
    for (const slot of shadow.querySelectorAll<HTMLElement>('.translation-slot')) {
      const senseIndex = Number(slot.dataset.senseIndex)
      const input = document.createElement('input')
      input.className = 'glossary-translation-input'
      input.lang = 'fr'
      input.placeholder = '(no draft)'
      input.dataset.senseIndex = String(senseIndex)
      input.defaultValue = (glossesRef.current[senseIndex] ?? []).join('; ')
      const onInput = () => {
        const parsed = input.value.split(';').map((s) => s.trim()).filter(Boolean)
        onChangeSenseRef.current(senseIndex, parsed)
      }
      input.addEventListener('input', onInput)
      cleanups.push(() => input.removeEventListener('input', onInput))
      slot.replaceWith(input)
    }

    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [articleHtml, css])

  useImperativeHandle(ref, () => ({
    setSenseValue(senseIndex, text) {
      const shadow = hostRef.current?.shadowRoot
      const input = shadow?.querySelector<HTMLInputElement>(`input[data-sense-index="${senseIndex}"]`)
      if (!input) return
      input.value = text
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
  }), [])

  if (error) {
    return <div className="text-red-400 text-sm p-4">No {contextLang} context card for seq {seq}: {error}</div>
  }
  if (!articleHtml) {
    return <div className="text-slate-500 text-sm p-4">Loading context…</div>
  }

  return (
    <div
      ref={hostRef}
      className="w-full h-full min-h-96 bg-slate-900 rounded-lg border border-slate-700 overflow-auto p-3"
    />
  )
})
