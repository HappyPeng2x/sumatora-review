// jitendex.css/common.css are a fixed light theme (no prefers-color-scheme
// support) written for a full HTML document -- this app injects just the
// <article> content into a shadow root (see ContextCard.tsx), so document-
// level selectors like `body` never match anything real and need
// redirecting to :host (the shadow root's attachment point) instead.
// Everything else here overrides just what needed to change for legibility
// on a dark background; tag chips, priority badges, and colored info-box
// borders already have their own solid/high-contrast colors and are left
// alone. Injected *after* jitendex.css/common.css so normal cascade order
// lets it win without needing !important.
export const DARK_OVERRIDES = `
:host {
  display: block;
  color-scheme: dark;
  font-family: jpmincho, serif;
  line-height: 1.5em;
  background: #0f172a;
  color: #cbd5e1;
}
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

/* The editable translation draft, injected as a real <input> right after
   each English .glossary block (see ContextCard.tsx's slot-filling effect)
   -- same side-by-side spirit as propose-translations.py's chunk .md
   summaries, but live-editable inline instead of a separate read-only panel. */
.glossary-translation-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-style: italic;
  font-family: jpmincho, serif;
  font-size: 1rem;
  color: #7dd3fc;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.3rem;
}
.glossary-translation-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
}
`
