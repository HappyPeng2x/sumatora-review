import { useState } from 'react'
import { ContextCard } from './ContextCard'
import { DecisionBar } from './DecisionBar'

interface Props {
  seq: number
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
export function EntryReviewer({ seq, model, initialGlosses, busy, onAccept, onReject, onRerunAI }: Props) {
  const [glosses, setGlosses] = useState(initialGlosses)

  function handleChangeSense(senseIndex: number, senseGlosses: string[]) {
    setGlosses((prev) => {
      const next = prev.slice()
      next[senseIndex] = senseGlosses
      return next
    })
  }

  return (
    <>
      <ContextCard key={seq} seq={seq} glosses={glosses} onChangeSense={handleChangeSense} />
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
