# TODO

## Show the real source language for English-less senses

JMdict doesn't align translations by sense index across languages -- when other
language communities (German, Hungarian, Russian, ...) contribute glosses, they add
them as entirely separate `<sense>` blocks in the entry's XML, not as extra glosses
attached to an existing English sense. So a sense can have zero English content at
all, e.g. seq 1054410 (ゴシック) senses 3-6 are German/Hungarian/Russian-only.

Originally this looked like a reason to hide these senses from review entirely (no
English to translate = nothing to review) -- but `find-translation-gaps.py` and
`propose-translations.py` were reworked to translate straight from Japanese + a
sense's actual non-English source language when English is absent, so these senses
now get real AI-drafted French too. The remaining gap: `ContextCard` only ever
renders gitenderml's *English* context card, so a German-sourced sense shows
"(no translation yet)" next to a French draft with no visible source text to check
the draft against. Fix is to show the sense's real source language + text (already
available per-sense in `gitender/translations/{lang}/...`) instead of the English
placeholder, so the reviewer has something to actually verify the AI draft against.

## Update README's ContextCard description

Still describes rendering via "a sandboxed iframe" -- stale since the shadow-DOM
rework (see `ContextCard.tsx`). Update the "How it fits together" section.

## Add PWA icons

`vite.config.ts`'s manifest has `icons: []`. Works fine as a browser tab, but "Add
to Home Screen" gets no real icon on most platforms.

## Make review language selectable

`ReviewPage.tsx` hardcodes `const LANG = 'fre'`. Fine while French is the only
language being drafted, but will need a picker (or at least a build-time/URL param)
once other target languages have proposal chunks worth reviewing.

## Build the regenerate-request consumer

"Re-run AI" (`DecisionBar`/`regenerate.ts`) writes a marker to SumatoraIndex's
`regenerate-requests/{lang}/{seq}.json`, but nothing reads it yet. Needs a script
(run locally, alongside `propose-translations.py`) that pulls SumatoraIndex, finds
pending requests, redrafts each via Ollama with `resolve_existing`'s per-sense logic
(so already-accepted senses stay untouched and only the flagged entry gets
regenerated), pushes the new draft to `translation-proposals`, and clears the
request marker. Deliberately deferred, along with pausing/restarting the main
generation batch to pick up the new per-sense/multi-source-language prompt logic --
both are one, separate follow-up task by design.

## ~~No way to revisit a decided entry~~ (done)

Added a History tab (`HistoryPage.tsx` + shared `EntryReviewer.tsx`) listing every
decision, most recent first, that reopens the same inline-editable card pre-filled
with what was previously recorded and lets you re-decide. Correcting an Accept to a
Reject also deletes the previously-written patch file in SumatoraIndex
(`revertAcceptedProposal`), not just the local record.
