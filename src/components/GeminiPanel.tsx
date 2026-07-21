interface Props {
  busy: boolean
  suggestions: string[][] | null
  error: string | null
  onAsk: () => void
  onUse: (senseIndex: number, glosses: string[]) => void
}

/**
 * Manual, on-demand second opinion from Gemini -- never fetched
 * automatically, only when this button is pressed (see EntryReviewer).
 * Suggestions are shown for comparison only; "use" copies one into the
 * corresponding sense's actual editable input (via ContextCard's
 * imperative handle), it's never applied on its own.
 */
export function GeminiPanel({ busy, suggestions, error, onAsk, onUse }: Props) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <button
        disabled={busy}
        onClick={onAsk}
        className="text-sm text-sky-400 hover:text-sky-300 disabled:opacity-50 self-start"
      >
        {busy ? 'Asking Gemini…' : suggestions ? 'Ask Gemini again ↻' : 'Ask Gemini for a second opinion ✨'}
      </button>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {suggestions && (
        <ul className="flex flex-col gap-1.5">
          {suggestions.map((glosses, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-sky-200 italic">
                {i + 1}. {glosses.join('; ')}
              </span>
              <button
                onClick={() => onUse(i, glosses)}
                className="text-xs text-slate-400 hover:text-slate-200 flex-shrink-0 underline"
              >
                use
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
