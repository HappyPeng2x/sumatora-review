import { putFile } from './github'

/**
 * Ask the (separately-run, local) generation pipeline to redraft a seq's
 * translation from scratch -- e.g. after noticing it was drafted before a
 * prompt fix, or before a sense's real source content was available. Just
 * writes a marker to SumatoraIndex (this app's only write-scoped repo); a
 * script run manually against SumatoraIndex's regenerate-requests/ picks
 * these up, redrafts via Ollama, and clears the marker. That consumer script
 * doesn't exist yet -- this only queues the request.
 */
export async function requestRegeneration(seq: number, lang: string, token: string): Promise<void> {
  await putFile(
    `regenerate-requests/${lang}/${seq}.json`,
    { seq, lang, requestedAt: Date.now() },
    token,
    `Request ${lang} regeneration for seq ${seq}`,
  )
}
