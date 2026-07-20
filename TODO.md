# TODO

## Skip senses with no English source content

JMdict doesn't align translations by sense index across languages -- when other
language communities (German, Hungarian, Russian, ...) contribute glosses, they add
them as entirely separate `<sense>` blocks in the entry's XML, not as extra glosses
attached to an existing English sense. So a sense can have zero English content at
all (confirmed via `gitender/translations/eng/{shard}/{seq}.json` showing
`"glosses": []` for these), e.g. seq 1054410 (ゴシック) senses 3-6 are
German/Hungarian/Russian-only.

Today `ContextCard` renders these as "(no translation yet)" with an empty, editable
draft input, as if French is missing a translation of an existing English sense --
but there's no English source for the AI to have translated in the first place, so
there's nothing to review. Filter these out of the rendered card (or at least
relabel them) so the reviewer isn't asked to fill in senses that were never English
to begin with. Likely fix is in `ContextCard.tsx`'s slot-filling effect, checking
whether the sense's English gloss list is non-empty before creating an input --
but check whether `render-entry-html.py` (gitenderml) should be the one skipping
these instead, since gitenderml's public-facing cards for other target languages
have the identical issue.

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

## No way to revisit a decided entry

Once accepted/rejected, an entry drops out of the queue with no browse/undo view --
decisions only live in this browser's IndexedDB (`decisions` store). If a wrong
Accept/Reject slips through, fixing it today means editing IndexedDB by hand or
correcting `patches/translations/fre/{seq}.json` directly in SumatoraIndex.
