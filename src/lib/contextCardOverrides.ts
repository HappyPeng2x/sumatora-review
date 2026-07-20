// jitendex.css/common.css are a fixed light theme (no prefers-color-scheme
// support) -- this app is dark-only, so the white entry card read as a jarring
// hole in the page. This stylesheet overrides just what needs to change for
// legibility on a dark background (page background/text, table chrome, the
// radial-gradient form badges that fade to white by design); tag chips,
// priority badges, and colored info-box borders already have their own
// solid/high-contrast colors and are left alone. Injected *after*
// jitendex.css/common.css in the iframe's <style> block so normal cascade
// order lets it win without needing !important.
export const DARK_OVERRIDES = `
:root { color-scheme: dark; }
body { background: #0f172a; color: #cbd5e1; }
a { color: #818cf8; }
a:hover { color: #a5b4fc; }
a:active { color: #fca5a5; }
.headline { color: #f1f5f9; }
table, th, td { border-color: #334155; }
th { background-color: #1e293b; color: #cbd5e1; }
.extra-label, .ex-sent-ja-footnote, .reference-label, .entry-footnotes { color: #94a3b8; }
.ex-sent { background-color: color-mix(in srgb, #7a8fa6 18%, transparent); }
.ex-sent-en-content { color: #cbd5e1; }
/* Light-theme badges fade to white on purpose; on dark that reads as a bright
   blob, so drop the gradient for a flat, still-legible fill instead. */
.form-pri > span { background: #16a34a; }
.form-irr > span { background: #dc2626; }
.form-out > span, .form-old > span { background: #2563eb; }
.form-rare > span { background: #9333ea; }
.form-valid > span { background: #475569; }

/* AI-drafted translation, interleaved per sense next to the English gloss
   it corresponds to (see interleaveTranslation() in ContextCard.tsx) -- the
   same side-by-side layout propose-translations.py's chunk .md summaries
   use for spot-checking, just inline instead of a separate table. */
.glossary-translation {
  display: block;
  margin-top: 0.15rem;
  color: #38bdf8;
  font-style: italic;
}
.glossary-translation::before {
  content: attr(data-lang-label) ' ';
  font-style: normal;
  font-weight: 600;
  opacity: 0.75;
}
`
