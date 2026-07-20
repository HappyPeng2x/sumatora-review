import { useEffect, useState } from 'react'
import { fetchProposal, type Proposal } from '../lib/proposals'

interface Props {
  lang: string
  path: string
  busy: boolean
  onDecide: (decision: 'accepted' | 'rejected', glosses?: string[][]) => void
}

export function ProposalEditor({ lang, path, busy, onDecide }: Props) {
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [glosses, setGlosses] = useState<string[][]>([])

  useEffect(() => {
    let cancelled = false
    setProposal(null)
    setError(null)
    fetchProposal(lang, path)
      .then((p) => {
        if (cancelled) return
        setProposal(p)
        setGlosses(p.glosses)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [lang, path])

  if (error) {
    return <div className="text-red-400 text-sm p-4">Failed to load proposal: {error}</div>
  }
  if (!proposal) {
    return <div className="text-slate-500 text-sm p-4">Loading proposal…</div>
  }

  function updateSense(i: number, text: string) {
    const next = glosses.slice()
    next[i] = text.split(';').map((s) => s.trim()).filter(Boolean)
    setGlosses(next)
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
      <div className="text-xs text-slate-500">Draft by {proposal.model} &middot; semicolon-separate synonyms</div>
      {glosses.map((sense, i) => (
        <div key={i} className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Sense {i + 1}</label>
          <input
            value={sense.join('; ')}
            onChange={(e) => updateSense(i, e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <button
          disabled={busy}
          onClick={() => onDecide('accepted', glosses)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-lg py-2 font-medium"
        >
          Accept
        </button>
        <button
          disabled={busy}
          onClick={() => onDecide('rejected')}
          className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg py-2 font-medium"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
