import { useCallback, useEffect, useState } from 'react'
import { getAllDecisions, recordDecision, getSetting, type ReviewDecision } from '../lib/db'
import { fetchProposal, acceptProposal, revertAcceptedProposal, proposalPath, type Proposal } from '../lib/proposals'
import { EntryReviewer } from '../components/EntryReviewer'

const LANG = 'fre'

export function HistoryPage() {
  const [decisions, setDecisions] = useState<ReviewDecision[] | null>(null)
  const [redoSeq, setRedoSeq] = useState<number | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const all = await getAllDecisions()
      all.sort((a, b) => b.reviewedAt - a.reviewedAt)
      setDecisions(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (redoSeq == null) return
    let cancelled = false
    setProposal(null)
    fetchProposal(LANG, proposalPath(redoSeq))
      .then((p) => !cancelled && setProposal(p))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [redoSeq])

  async function handleRedecide(decision: 'accepted' | 'rejected', glosses: string[][]) {
    if (redoSeq == null) return
    setBusy(true)
    setError(null)
    try {
      const token = await getSetting('githubToken')
      if (!token) throw new Error('No GitHub token set -- add one in Settings first')
      if (decision === 'accepted') {
        await acceptProposal(redoSeq, LANG, glosses, token)
      } else {
        // Correcting a prior Accept to Reject -- the earlier PUT wrote a
        // real patch file upstream, so undoing the decision here must also
        // remove it, not just flip a local flag.
        await revertAcceptedProposal(redoSeq, LANG, token)
      }
      await recordDecision({ seq: redoSeq, lang: LANG, decision, glosses, reviewedAt: Date.now() })
      setRedoSeq(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (redoSeq != null) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-700 flex-shrink-0 flex items-center justify-between">
          <span>Redoing seq {redoSeq}</span>
          <button onClick={() => setRedoSeq(null)} className="text-indigo-400 underline">
            Back to history
          </button>
        </div>
        {error && <div className="px-4 py-2 text-red-400 text-sm flex-shrink-0">{error}</div>}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">
          {proposal ? (
            <EntryReviewer
              key={redoSeq}
              seq={redoSeq}
              model={proposal.model}
              initialGlosses={decisions?.find((d) => d.seq === redoSeq)?.glosses ?? proposal.glosses}
              busy={busy}
              onAccept={(glosses) => handleRedecide('accepted', glosses)}
              onReject={(glosses) => handleRedecide('rejected', glosses)}
            />
          ) : (
            <div className="text-slate-500 text-sm p-4">Loading proposal…</div>
          )}
        </div>
      </div>
    )
  }

  if (error && !decisions) {
    return <div className="p-4 text-red-400">{error}</div>
  }
  if (!decisions) {
    return <div className="p-4 text-slate-500">Loading history…</div>
  }
  if (decisions.length === 0) {
    return <div className="p-4 text-slate-400">No reviewed entries yet.</div>
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {error && <div className="px-4 py-2 text-red-400 text-sm flex-shrink-0">{error}</div>}
      <div className="flex flex-col divide-y divide-slate-800">
        {decisions.map((d) => (
          <button
            key={d.seq}
            onClick={() => setRedoSeq(d.seq)}
            className="flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800"
          >
            <div className="flex flex-col">
              <span className="text-slate-100 text-sm">seq {d.seq}</span>
              <span className="text-slate-500 text-xs">{new Date(d.reviewedAt).toLocaleString()}</span>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                d.decision === 'accepted' ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {d.decision}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
