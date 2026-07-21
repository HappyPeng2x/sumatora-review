import { useCallback, useEffect, useState } from 'react'
import { buildQueue, type QueueEntry } from '../lib/reviewQueue'
import { getDecidedSeqs, recordDecision, getSetting, type Decision } from '../lib/db'
import { fetchProposal, acceptProposal, fetchAcceptedSeqs, type Proposal } from '../lib/proposals'
import { requestRegeneration, fetchRegenerateRequestedSeqs } from '../lib/regenerate'
import { EntryReviewer } from '../components/EntryReviewer'

const LANG = 'fre'

export function ReviewPage() {
  const [queue, setQueue] = useState<QueueEntry[] | null>(null)
  const [decided, setDecided] = useState<Set<number>>(new Set())
  const [index, setIndex] = useState(0)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      // Union local decisions (covers Rejects, which have no git trace) with
      // git-accepted and git-pending-regeneration seqs (covers those made
      // from another device) -- see fetchAcceptedSeqs/fetchRegenerateRequestedSeqs
      // for why only those two are recoverable from git.
      const [q, local, accepted, regenerating] = await Promise.all([
        buildQueue(LANG),
        getDecidedSeqs(),
        fetchAcceptedSeqs(LANG),
        fetchRegenerateRequestedSeqs(LANG),
      ])
      const d = new Set([...local, ...accepted, ...regenerating])
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

  useEffect(() => {
    if (!current) return
    let cancelled = false
    setProposal(null)
    fetchProposal(LANG, current.path)
      .then((p) => {
        if (cancelled) return
        setProposal(p)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [current])

  async function handleDecide(decision: Decision, glosses: string[][]) {
    if (!current) return
    setBusy(true)
    setError(null)
    try {
      if (decision === 'accepted' || decision === 'regenerate_requested') {
        const token = await getSetting('githubToken')
        if (!token) throw new Error('No GitHub token set -- add one in Settings first')
        if (decision === 'accepted') {
          await acceptProposal(current.seq, LANG, glosses, token)
        } else {
          await requestRegeneration(current.seq, LANG, token)
        }
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
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">
        {proposal ? (
          // Only mounted once the proposal has loaded, so the initial
          // defaultValue each input seeds itself with (see ContextCard's
          // slot-filling effect) is never a race against this fetch --
          // key={seq} on EntryReviewer already forces a fresh mount per
          // entry anyway.
          <EntryReviewer
            key={current.seq}
            seq={current.seq}
            model={proposal.model}
            initialGlosses={proposal.glosses}
            busy={busy}
            onAccept={(glosses) => handleDecide('accepted', glosses)}
            onReject={(glosses) => handleDecide('rejected', glosses)}
            onRerunAI={(glosses) => handleDecide('regenerate_requested', glosses)}
          />
        ) : (
          <div className="text-slate-500 text-sm p-4">Loading proposal…</div>
        )}
      </div>
    </div>
  )
}
