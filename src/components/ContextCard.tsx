import { useEffect, useState } from 'react'
import { fetchText, rawUrl, RENDER_REPO, RENDER_REF } from '../lib/github'
import { fetchProposal } from '../lib/proposals'
import { interleaveTranslation } from '../lib/interleave'
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
  /** Language whose draft gets interleaved next to each English sense. */
  translationLang?: string
}

/**
 * Renders gitenderml's pre-rendered Jitendex-styled entry card for full
 * context (headword+furigana, every English sense with tags/restrictions,
 * linked examples, forms table) -- reusing that rendering investment
 * directly rather than re-fetching gitender's raw JSON and re-implementing
 * display here. The AI-drafted translation is interleaved directly under
 * each English sense (see interleaveTranslation()), so reviewing doesn't
 * mean flicking between two separate panels for the thing that actually
 * needs judging. Isolated in a sandboxed iframe so gitenderml's CSS classes
 * (e.g. ".sense", ".gloss") can never collide with this app's own Tailwind.
 */
export function ContextCard({ seq, contextLang = 'eng', translationLang = 'fre' }: Props) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSrcDoc(null)
    setError(null)
    const shard = Math.floor(seq / 10000)
    const path = `${contextLang}/${shard}/${seq}.html`
    Promise.all([
      fetchText(rawUrl(RENDER_REPO, RENDER_REF, path)),
      getCss(),
      fetchProposal(translationLang, `${shard}/${seq}.json`).catch(() => null),
    ])
      .then(([html, css, proposal]) => {
        if (cancelled) return
        const withTranslation = proposal
          ? interleaveTranslation(html, proposal.glosses, translationLang.toUpperCase())
          : html
        const inlined = withTranslation
          .replace(/<link rel="stylesheet" href="[^"]+">\s*/g, '')
          .replace('</head>', `<style>${css}</style></head>`)
        setSrcDoc(inlined)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [seq, contextLang, translationLang])

  if (error) {
    return <div className="text-red-400 text-sm p-4">No {contextLang} context card for seq {seq}: {error}</div>
  }
  if (!srcDoc) {
    return <div className="text-slate-500 text-sm p-4">Loading context…</div>
  }

  return (
    <iframe
      title={`Entry ${seq} context`}
      srcDoc={srcDoc}
      sandbox=""
      className="w-full h-full min-h-96 bg-slate-900 rounded-lg border border-slate-700"
    />
  )
}
