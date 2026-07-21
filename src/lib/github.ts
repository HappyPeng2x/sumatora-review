// All repos this app talks to, and how it talks to them:
//   - PROPOSALS_REPO, RENDER_REPO: read-only, plain unauthenticated fetches
//     (raw content + the Trees API) -- never written to from this app.
//   - INDEX_REPO: the only repo this app writes to, via the Contents API,
//     using the PAT from settings. Scope that PAT to contents:write on this
//     repo only.
export const PROPOSALS_REPO = 'HappyPeng2x/Sumatora-Translation-Proposals-JMDict'
export const PROPOSALS_REF = 'main'
export const RENDER_REPO = 'HappyPeng2x/gitenderml'
export const RENDER_REF = 'main'
export const ENTRIES_REPO = 'HappyPeng2x/gitender'
export const ENTRIES_REF = 'main'
export const INDEX_REPO = 'HappyPeng2x/SumatoraIndex'
export const INDEX_REF = 'master'

export function rawUrl(repo: string, ref: string, path: string): string {
  return `https://raw.githubusercontent.com/${repo}/${ref}/${path}`
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return res.text()
}

/** One entry from the git Trees API (?recursive=true). */
export interface TreeEntry {
  path: string
  type: 'blob' | 'tree'
}

export async function fetchTree(repo: string, ref: string): Promise<TreeEntry[]> {
  const url = `https://api.github.com/repos/${repo}/git/trees/${ref}?recursive=1`
  const data = await fetchJson<{ tree: TreeEntry[]; truncated: boolean }>(url)
  if (data.truncated) {
    // Would need pagination via multiple sub-tree calls; not expected at
    // today's proposals-repo scale (chunks are per-language, per-hour).
    console.warn(`Tree listing for ${repo}@${ref} was truncated by the GitHub API`)
  }
  return data.tree
}

function base64EncodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/**
 * Create or update a file in INDEX_REPO via the Contents API. Looks up the
 * current sha first (required by the API for updates; harmless to skip for
 * a brand-new file, so a 404 there is not an error).
 */
export async function putFile(path: string, content: object, token: string, message: string): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${INDEX_REPO}/contents/${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  }

  let sha: string | undefined
  const existing = await fetch(`${apiUrl}?ref=${INDEX_REF}`, { headers })
  if (existing.ok) {
    const data = (await existing.json()) as { sha: string }
    sha = data.sha
  } else if (existing.status !== 404) {
    throw new Error(`Checking existing file failed: ${existing.status}`)
  }

  const body = {
    message,
    content: base64EncodeUtf8(JSON.stringify(content, null, 2) + '\n'),
    branch: INDEX_REF,
    ...(sha ? { sha } : {}),
  }

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`GitHub write failed (${res.status}): ${detail}`)
  }
}

/**
 * Delete a file from INDEX_REPO via the Contents API, if it exists. Used to
 * revert a previously-accepted translation when a decision is corrected to
 * Reject during a History redo -- a no-op (not an error) if nothing was ever
 * accepted for this path.
 */
export async function deleteFile(path: string, token: string, message: string): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${INDEX_REPO}/contents/${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  }

  const existing = await fetch(`${apiUrl}?ref=${INDEX_REF}`, { headers })
  if (existing.status === 404) return
  if (!existing.ok) throw new Error(`Checking existing file failed: ${existing.status}`)
  const { sha } = (await existing.json()) as { sha: string }

  const res = await fetch(apiUrl, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sha, branch: INDEX_REF }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`GitHub delete failed (${res.status}): ${detail}`)
  }
}
