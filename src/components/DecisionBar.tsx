interface Props {
  model: string
  busy: boolean
  onAccept: () => void
  onReject: () => void
  onRerunAI?: () => void
}

/**
 * Three parallel outcomes for a draft, not two-plus-an-afterthought: Accept,
 * Reject, or ask the AI to redraft it (its own status -- neither an accepted
 * translation nor a rejected one, just deferred pending a better draft).
 * Clicking any of them hands off to the caller's own decide/advance flow
 * (see ReviewPage/HistoryPage's handlers), so this button set doesn't try to
 * show its own "requested" confirmation state -- the entry moves on exactly
 * like Accept/Reject do, and its status shows up in History.
 */
export function DecisionBar({ model, busy, onAccept, onReject, onRerunAI }: Props) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
      <div className="text-xs text-slate-500">Draft by {model} &middot; edit inline above, semicolon-separated synonyms</div>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={onAccept}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-lg py-2 font-medium"
        >
          Accept
        </button>
        <button
          disabled={busy}
          onClick={onReject}
          className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg py-2 font-medium"
        >
          Reject
        </button>
      </div>
      {onRerunAI && (
        <button
          disabled={busy}
          onClick={onRerunAI}
          className="bg-amber-700/40 hover:bg-amber-700/60 active:bg-amber-700/70 disabled:opacity-50 text-amber-200 border border-amber-700/60 rounded-lg py-2 font-medium text-sm"
        >
          Draft looks wrong – re-run AI ↻
        </button>
      )}
    </div>
  )
}
