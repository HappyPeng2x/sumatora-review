# Sumatora Review

A small PWA for reviewing AI-drafted JMdict translations before they're accepted into
[SumatoraIndex](https://github.com/HappyPeng2x/SumatoraIndex). Maintainer-only tool, not the end-user
dictionary app (that's [sumatora-pwa](https://github.com/HappyPeng2x/sumatora-pwa)) -- separate repo
because it's a different audience with different needs (no offline dictionary database, no search; just
a queue of drafts to accept/edit/reject).

## How it fits together

- **Reads** the review queue from [translation-proposals](https://github.com/HappyPeng2x/Sumatora-Translation-Proposals-JMDict)
  (`{lang}/chunks/chunk-NNNN.jsonl` + `.done` markers -- see that repo's README).
- **Reads** full entry context from [gitenderml](https://github.com/HappyPeng2x/gitenderml)'s
  pre-rendered Jitendex-styled HTML cards, displayed in a sandboxed iframe -- this app does no rendering
  of its own, it reuses that repo's output directly.
- **Writes** accepted translations to `SumatoraIndex`'s `patches/translations/{lang}/{seq}.json` via the
  GitHub Contents API, as an RFC 7396 merge-patch fragment. `jmdict-to-git.py`'s patch system picks these
  up on the next regeneration (`load_translation_patches()`).

Local review state (which entries are already decided) lives in this browser's IndexedDB only -- it's
not synced anywhere, so decisions made on one device don't show up on another.

## Setup

```
npm install
npm run dev
```

Requires a GitHub fine-grained personal access token, scoped to `contents: write` on `SumatoraIndex`
only, entered once under the Settings tab (stored in IndexedDB, never sent anywhere but
`api.github.com`).

## License

GPLv3 (see [LICENSE](LICENSE)), matching SumatoraIndex's own tooling license -- this is application
code, not dictionary content.
