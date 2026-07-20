interface Props {
  model: string
  busy: boolean
  onAccept: () => void
  onReject: () => void
}

/**
 * Just the decision itself -- the actual editable draft lives inline in
 * ContextCard now, right next to the English sense it translates, so this
 * doesn't need to show or own any per-sense state.
 */
export function DecisionBar({ model, busy, onAccept, onReject }: Props) {
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
    </div>
  )
}
