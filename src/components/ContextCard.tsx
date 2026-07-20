import { useEffect, useState } from 'react'
import { fetchText, rawUrl, RENDER_REPO, RENDER_REF } from '../lib/github'

let cssCache: Promise<string> | null = null

function getCss(): Promise<string> {
  if (!cssCache) {
    cssCache = Promise.all([
      fetchText(rawUrl(RENDER_REPO, RENDER_REF, 'common.css')),
      fetchText(rawUrl(RENDER_REPO, RENDER_REF, 'jitendex.css')),
    ]).then(([common, jitendex]) => `${common}\n${jitendex}`)
  }
  return cssCache
}

interface Props {
  seq: number
  lang?: string
}

/**
 * Renders gitenderml's pre-rendered Jitendex-styled entry card for full
 * context (headword+furigana, every English sense with tags/restrictions,
 * linked examples, forms table) -- reusing that rendering investment
 * directly rather than re-fetching gitender's raw JSON and re-implementing
 * display here. Isolated in a sandboxed iframe so gitenderml's CSS classes
 * (e.g. ".sense", ".gloss") can never collide with this app's own Tailwind.
 */
export function ContextCard({ seq, lang = 'eng' }: Props) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSrcDoc(null)
    setError(null)
    const shard = Math.floor(seq / 10000)
    const path = `${lang}/${shard}/${seq}.html`
    Promise.all([fetchText(rawUrl(RENDER_REPO, RENDER_REF, path)), getCss()])
      .then(([html, css]) => {
        if (cancelled) return
        const inlined = html
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
  }, [seq, lang])

  if (error) {
    return <div className="text-red-400 text-sm p-4">No {lang} context card for seq {seq}: {error}</div>
  }
  if (!srcDoc) {
    return <div className="text-slate-500 text-sm p-4">Loading context…</div>
  }

  return (
    <iframe
      title={`Entry ${seq} context`}
      srcDoc={srcDoc}
      sandbox=""
      className="w-full h-full min-h-96 bg-white rounded-lg border border-slate-700"
    />
  )
}
