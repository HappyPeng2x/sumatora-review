import type { Headword, SenseSource } from './entries'

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
// Google's Interactions API (GA since June 2026) superseded generateContent
// as the recommended surface -- see https://ai.google.dev/gemini-api/docs/interactions-overview.
// Model is Google's current free-tier flash model; update here if Google
// renames/retires it -- see https://ai.google.dev/gemini-api/docs/pricing.
const GEMINI_MODEL = 'gemini-3.5-flash'

const LANG_FULL_NAMES: Record<string, string> = {
  eng: 'English',
  ger: 'German',
  rus: 'Russian',
  hun: 'Hungarian',
  dut: 'Dutch',
  spa: 'Spanish',
  swe: 'Swedish',
  slv: 'Slovenian',
}

function formatSources(sources: Record<string, string[]>): string {
  const parts: string[] = []
  for (const [lang, glosses] of Object.entries(sources)) {
    if (glosses.length === 0) continue
    const label = lang === 'eng' ? '' : `(${LANG_FULL_NAMES[lang] ?? lang}) `
    parts.push(`${label}${glosses.join('; ')}`)
  }
  return parts.length > 0 ? parts.join(' / ') : '(no source text)'
}

// Same lexicographer framing and anti-echo guardrail wording as
// propose-translations.py's SYSTEM_PROMPT (that file found, the hard way,
// that a small local model needs to be told explicitly not to copy a
// non-English source word through unchanged) -- adapted here to ask for
// every sense at once, since this is a manual "second opinion" comparison
// tool, not the gap-filling batch pipeline.
function systemPrompt(langName: string): string {
  return (
    `You are a bilingual lexicographer writing ${langName} glosses for a ` +
    `Japanese-${langName} dictionary, adapting entries from JMdict. The ` +
    `entry below lists every distinct sense of one Japanese headword -- the ` +
    `same word often has several unrelated or only loosely related ` +
    `meanings. JMdict is a multilingual project: most senses have an ` +
    `English definition, but some exist only because a non-English ` +
    `contributor project (German, Russian, Hungarian, ...) added them, so ` +
    `their source text is in that language instead -- when a sense is ` +
    `marked with a source language other than English, translate it using ` +
    `the Japanese headword plus that source text, the same way you would ` +
    `from English. Use every sense's part-of-speech/field/misc tags and the ` +
    `other listed senses as context to choose the most specific, idiomatic ` +
    `${langName} equivalent for each sense -- not a generic word that could ` +
    `equally apply to several of the listed senses. The tags are context ` +
    `for your word choice only -- never include a tag itself in the ` +
    `output. Every gloss you output, with no exception, must be actual ` +
    `${langName} and nothing else -- never copy a source word through ` +
    `unchanged, never cite or parenthesize the source word or its source ` +
    `language inside a gloss. Produce one or more short ${langName} ` +
    `glosses per sense, in the same terse dictionary style as the source ` +
    `(not full sentences, no explanations); each synonym is its own array ` +
    `entry, never joined into one string with semicolons or commas. ` +
    `Return exactly one ${langName} entry per sense listed, in the exact ` +
    `order given.`
  )
}

function buildPrompt(headword: Headword, senses: SenseSource[]): string {
  const primary = headword.writings[0] ?? headword.readings[0] ?? ''
  const readings = headword.readings.join(', ') || '(no reading)'
  const lines = [
    `Japanese headword: ${primary}`,
    `Readings: ${readings}`,
    '',
    `Every sense of this word (respond with exactly ${senses.length} entries, in this order):`,
  ]
  for (const sense of senses) {
    lines.push(`${sense.number}. [${sense.tags.join(', ')}] ${formatSources(sense.sources)}`)
  }
  return lines.join('\n')
}

interface InteractionContentPart {
  type: string
  text?: string
}
interface InteractionStep {
  type: string
  content?: InteractionContentPart[]
}
interface InteractionResponse {
  steps?: InteractionStep[]
}

/**
 * Ask Gemini for a second opinion on every sense of one entry -- manual,
 * on-demand only (see EntryReviewer's "Ask Gemini" button), never run
 * automatically. Uses the caller's own API key (Settings), sent only to
 * generativelanguage.googleapis.com.
 */
export async function askGemini(headword: Headword, senses: SenseSource[], langName: string, apiKey: string): Promise<string[][]> {
  const schema = {
    type: 'object',
    properties: {
      senses: {
        type: 'array',
        items: { type: 'array', items: { type: 'string' } },
      },
    },
    required: ['senses'],
  }

  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      system_instruction: systemPrompt(langName),
      input: buildPrompt(headword, senses),
      generation_config: { temperature: 0.3 },
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema,
      },
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Gemini request failed (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as InteractionResponse
  const text = (data.steps ?? [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('')
  if (!text) throw new Error('Gemini returned no output text')

  const parsed = JSON.parse(text) as { senses?: unknown }
  const result = parsed.senses
  if (!Array.isArray(result) || result.length !== senses.length) {
    const got = Array.isArray(result) ? result.length : typeof result
    throw new Error(`Expected ${senses.length} senses back from Gemini, got ${got}`)
  }
  return result as string[][]
}
