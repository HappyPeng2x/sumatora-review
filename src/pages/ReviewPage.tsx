import { useCallback, useEffect, useState } from 'react'
import { buildQueue, type QueueEntry } from '../lib/reviewQueue'
import { getDecidedSeqs, recordDecision, getSetting } from '../lib/db'
import { acceptProposal } from '../lib/proposals'
import { ContextCard } from '../components/ContextCard'
import { ProposalEditor } from '../components/ProposalEditor'

const LANG = 'fre'

export function ReviewPage() {
  const [queue, setQueue] = useState<QueueEntry[] | null>(null)
  const [decided, setDecided] = useState<Set<number>>(new Set())
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [q, d] = await Promise.all([buildQueue(LANG), getDecidedSeqs()])
      setQueue(q)
      setDecided(d)
      const firstUndecided = q.findIndex((e) => !d.has(e.seq))
      setIndex(firstUndecided === -1 ? q.length : firstUndecided)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const current = queue?.[index]

  async function handleDecide(decision: 'accepted' | 'rejected', glosses?: string[][]) {
    if (!current) return
    setBusy(true)
    setError(null)
    try {
      if (decision === 'accepted') {
        const token = await getSetting('githubToken')
        if (!token) throw new Error('No GitHub token set -- add one in Settings first')
        await acceptProposal(current.seq, LANG, glosses ?? [], token)
      }
      await recordDecision({ seq: current.seq, lang: LANG, decision, glosses, reviewedAt: Date.now() })
      setDecided((prev) => new Set(prev).add(current.seq))
      setIndex((i) => i + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (error && !queue) {
    return <div className="p-4 text-red-400">{error}</div>
  }
  if (!queue) {
    return <div className="p-4 text-slate-500">Loading review queue…</div>
  }
  if (!current) {
    return (
      <div className="p-4 text-slate-300 flex flex-col gap-2">
        <p>
          All caught up &mdash; {decided.size} of {queue.length} reviewed.
        </p>
        <button onClick={refresh} className="text-indigo-400 underline self-start">
          Check for more
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-700 flex-shrink-0">
        {decided.size} / {queue.length} reviewed &middot; seq {current.seq}
      </div>
      {error && <div className="px-4 py-2 text-red-400 text-sm flex-shrink-0">{error}</div>}
      <div className="flex-1 overflow-y-auto flex flex-col md:flex-row gap-3 p-3">
        <div className="flex-1 min-h-96">
          <ContextCard key={current.seq} seq={current.seq} />
        </div>
        <div className="flex-1">
          <ProposalEditor key={current.seq} lang={LANG} path={current.path} busy={busy} onDecide={handleDecide} />
        </div>
      </div>
    </div>
  )
}
