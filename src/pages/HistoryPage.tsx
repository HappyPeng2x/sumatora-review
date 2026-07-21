import { useCallback, useEffect, useState } from 'react'
import { getAllDecisions, recordDecision, getSetting, type Decision } from '../lib/db'
import {
  fetchProposal,
  acceptProposal,
  revertAcceptedProposal,
  fetchAcceptedSeqs,
  fetchAcceptedTranslation,
  proposalPath,
  type Proposal,
} from '../lib/proposals'
import { requestRegeneration, fetchRegenerateRequestedSeqs } from '../lib/regenerate'
import { fetchHeadword, type Headword } from '../lib/entries'
import { EntryReviewer } from '../components/EntryReviewer'
import { HeadwordLine } from '../components/HeadwordLine'

const LANG = 'fre'

// Module-level so headwords fetched on an earlier visit to this tab don't
// get re-fetched every time -- gitender's entries/ never changes for an
// already-decided seq, so there's nothing to invalidate.
const headwordCache = new Map<number, Headword>()

const DECISION_LABEL: Record<Decision, string> = {
  accepted: 'accepted',
  rejected: 'rejected',
  regenerate_requested: 're-run requested',
}
const DECISION_BADGE_CLASS: Record<Decision, string> = {
  accepted: 'bg-emerald-900 text-emerald-300',
  rejected: 'bg-slate-700 text-slate-300',
  regenerate_requested: 'bg-amber-900 text-amber-300',
}

interface HistoryRow {
  seq: number
  decision: Decision
  /** null for a row known only from git (decided on another device) -- the
   * Contents/Trees API doesn't expose a commit timestamp per file cheaply,
   * so these just sort after every row with a real one. */
  reviewedAt: number | null
  glosses?: string[][]
}

export function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null)
  const [redoSeq, setRedoSeq] = useState<number | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [redoInitialGlosses, setRedoInitialGlosses] = useState<string[][] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [headwords, setHeadwords] = useState<Map<number, Headword>>(headwordCache)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [local, accepted, regenerating] = await Promise.all([
        getAllDecisions(),
        fetchAcceptedSeqs(LANG),
        fetchRegenerateRequestedSeqs(LANG),
      ])
      const localSeqs = new Set(local.map((d) => d.seq))
      const merged: HistoryRow[] = [
        ...local.map((d): HistoryRow => ({ seq: d.seq, decision: d.decision, reviewedAt: d.reviewedAt, glosses: d.glosses })),
        ...[...accepted]
          .filter((seq) => !localSeqs.has(seq))
          .map((seq): HistoryRow => ({ seq, decision: 'accepted', reviewedAt: null })),
        ...[...regenerating]
          .filter((seq) => !localSeqs.has(seq) && !accepted.has(seq))
          .map((seq): HistoryRow => ({ seq, decision: 'regenerate_requested', reviewedAt: null })),
      ]
      merged.sort((a, b) => (b.reviewedAt ?? -1) - (a.reviewedAt ?? -1))
      setRows(merged)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!rows) return
    const missing = rows.filter((r) => !headwordCache.has(r.seq))
    if (missing.length === 0) return
    let cancelled = false
    Promise.allSettled(missing.map((r) => fetchHeadword(r.seq).then((h) => [r.seq, h] as const))).then((results) => {
      if (cancelled) return
      for (const result of results) {
        if (result.status === 'fulfilled') headwordCache.set(...result.value)
      }
      setHeadwords(new Map(headwordCache))
    })
    return () => {
      cancelled = true
    }
  }, [rows])

  useEffect(() => {
    if (redoSeq == null) return
    let cancelled = false
    setProposal(null)
    setRedoInitialGlosses(null)
    const row = rows?.find((r) => r.seq === redoSeq)
    Promise.all([
      fetchProposal(LANG, proposalPath(redoSeq)),
      // A local decision already carries the right seed value (see below);
      // only a git-only accepted row needs its content fetched separately.
      row?.glosses ? Promise.resolve(row.glosses) : row?.decision === 'accepted'
        ? fetchAcceptedTranslation(redoSeq, LANG)
        : Promise.resolve(undefined),
    ])
      .then(([p, seed]) => {
        if (cancelled) return
        setProposal(p)
        setRedoInitialGlosses(seed ?? p.glosses)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [redoSeq, rows])

  async function handleRedecide(decision: Decision, glosses: string[][]) {
    if (redoSeq == null) return
    setBusy(true)
    setError(null)
    try {
      const token = await getSetting('githubToken')
      if (!token) throw new Error('No GitHub token set -- add one in Settings first')
      if (decision === 'accepted') {
        await acceptProposal(redoSeq, LANG, glosses, token)
      } else {
        // Correcting a prior Accept to Reject or re-run-AI -- the earlier
        // PUT wrote a real patch file upstream, so undoing the decision
        // here must also remove it, not just flip a local flag. No-op
        // (safe) if nothing was ever accepted for this seq.
        await revertAcceptedProposal(redoSeq, LANG, token)
      }
      if (decision === 'regenerate_requested') {
        await requestRegeneration(redoSeq, LANG, token)
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
          {proposal && redoInitialGlosses ? (
            <EntryReviewer
              key={redoSeq}
              seq={redoSeq}
              lang={LANG}
              model={proposal.model}
              initialGlosses={redoInitialGlosses}
              busy={busy}
              onAccept={(glosses) => handleRedecide('accepted', glosses)}
              onReject={(glosses) => handleRedecide('rejected', glosses)}
              onRerunAI={(glosses) => handleRedecide('regenerate_requested', glosses)}
            />
          ) : (
            <div className="text-slate-500 text-sm p-4">Loading proposal…</div>
          )}
        </div>
      </div>
    )
  }

  if (error && !rows) {
    return <div className="p-4 text-red-400">{error}</div>
  }
  if (!rows) {
    return <div className="p-4 text-slate-500">Loading history…</div>
  }
  if (rows.length === 0) {
    return <div className="p-4 text-slate-400">No reviewed entries yet.</div>
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {error && <div className="px-4 py-2 text-red-400 text-sm flex-shrink-0">{error}</div>}
      <div className="flex flex-col divide-y divide-slate-800">
        {rows.map((d) => (
          <button
            key={d.seq}
            onClick={() => setRedoSeq(d.seq)}
            className="flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <HeadwordLine headword={headwords.get(d.seq)} />
              <span className="text-slate-500 text-xs">
                seq {d.seq} &middot;{' '}
                {d.reviewedAt != null ? new Date(d.reviewedAt).toLocaleString() : `${DECISION_LABEL[d.decision]} elsewhere`}
              </span>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${DECISION_BADGE_CLASS[d.decision]}`}>
              {DECISION_LABEL[d.decision]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
