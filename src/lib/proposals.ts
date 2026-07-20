import { fetchJson, rawUrl, putFile, deleteFile, PROPOSALS_REPO, PROPOSALS_REF } from './github'

export interface Proposal {
  seq: number
  lang: string
  glosses: string[][]
  model: string
}

export async function fetchProposal(lang: string, path: string): Promise<Proposal> {
  return fetchJson<Proposal>(rawUrl(PROPOSALS_REPO, PROPOSALS_REF, `${lang}/${path}`))
}

/**
 * Write an accepted translation as an RFC 7396 JSON Merge Patch fragment to
 * SumatoraIndex's patches/translations/{lang}/{seq}.json -- the same shape
 * jmdict-to-git.py's apply_patch() already expects for entry patches, now
 * also loaded for translations (load_translation_patches()).
 */
export async function acceptProposal(
  seq: number,
  lang: string,
  glosses: string[][],
  token: string,
): Promise<void> {
  await putFile(
    `patches/translations/${lang}/${seq}.json`,
    { glosses },
    token,
    `Accept ${lang} translation for seq ${seq}`,
  )
}

/**
 * Revert a previously-accepted translation -- used when a History redo
 * corrects an earlier Accept to a Reject. No-op if nothing was accepted for
 * this seq (Accept was never clicked, or it was already reverted).
 */
export async function revertAcceptedProposal(seq: number, lang: string, token: string): Promise<void> {
  await deleteFile(
    `patches/translations/${lang}/${seq}.json`,
    token,
    `Revert accepted ${lang} translation for seq ${seq}`,
  )
}

/** Deterministic path for a seq within a language dir, matching propose-translations.py's sharding. */
export function proposalPath(seq: number): string {
  return `${Math.floor(seq / 10000)}/${seq}.json`
}
