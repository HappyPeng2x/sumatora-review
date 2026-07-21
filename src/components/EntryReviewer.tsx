import { useRef, useState } from 'react'
import { ContextCard, type ContextCardHandle } from './ContextCard'
import { DecisionBar } from './DecisionBar'
import { GeminiPanel } from './GeminiPanel'
import { getSetting } from '../lib/db'
import { fetchHeadword, fetchSenseSources } from '../lib/entries'
import { askGemini } from '../lib/gemini'

const LANG_NAMES: Record<string, string> = {
  fre: 'French', ger: 'German', spa: 'Spanish', dut: 'Dutch',
  rus: 'Russian', hun: 'Hungarian', swe: 'Swedish', slv: 'Slovenian',
}

interface Props {
  seq: number
  lang: string
  model: string
  initialGlosses: string[][]
  busy: boolean
  onAccept: (glosses: string[][]) => void
  onReject: (glosses: string[][]) => void
  onRerunAI?: (glosses: string[][]) => void
}

/**
 * The ContextCard + DecisionBar pairing shared by the normal review queue
 * (ReviewPage) and a History redo (HistoryPage) -- owns the in-progress
 * glosses draft itself so both callers just get the final value back at
 * decide-time instead of having to mirror this state themselves.
 */
export function EntryReviewer({ seq, lang, model, initialGlosses, busy, onAccept, onReject, onRerunAI }: Props) {
  const [glosses, setGlosses] = useState(initialGlosses)
  const contextCardRef = useRef<ContextCardHandle>(null)

  const [geminiSuggestions, setGeminiSuggestions] = useState<string[][] | null>(null)
  const [geminiBusy, setGeminiBusy] = useState(false)
  const [geminiError, setGeminiError] = useState<string | null>(null)

  function handleChangeSense(senseIndex: number, senseGlosses: string[]) {
    setGlosses((prev) => {
      const next = prev.slice()
      next[senseIndex] = senseGlosses
      return next
    })
  }

  async function handleAskGemini() {
    setGeminiBusy(true)
    setGeminiError(null)
    try {
      const key = await getSetting('geminiApiKey')
      if (!key) throw new Error('No Gemini API key set -- add one in Settings first')
      const [headword, senses] = await Promise.all([fetchHeadword(seq), fetchSenseSources(seq)])
      const result = await askGemini(headword, senses, LANG_NAMES[lang] ?? lang, key)
      setGeminiSuggestions(result)
    } catch (e) {
      setGeminiError(e instanceof Error ? e.message : String(e))
    } finally {
      setGeminiBusy(false)
    }
  }

  function handleUseGeminiSuggestion(senseIndex: number, senseGlosses: string[]) {
    // Goes through the real <input> (see ContextCardHandle), not just
    // handleChangeSense directly -- these inputs are uncontrolled, so
    // updating `glosses` state alone wouldn't change what's visibly shown.
    contextCardRef.current?.setSenseValue(senseIndex, senseGlosses.join('; '))
  }

  return (
    <>
      <ContextCard ref={contextCardRef} key={seq} seq={seq} glosses={glosses} onChangeSense={handleChangeSense} />
      <GeminiPanel
        busy={geminiBusy}
        suggestions={geminiSuggestions}
        error={geminiError}
        onAsk={handleAskGemini}
        onUse={handleUseGeminiSuggestion}
      />
      <DecisionBar
        model={model}
        busy={busy}
        onAccept={() => onAccept(glosses)}
        onReject={() => onReject(glosses)}
        onRerunAI={onRerunAI ? () => onRerunAI(glosses) : undefined}
      />
    </>
  )
}
