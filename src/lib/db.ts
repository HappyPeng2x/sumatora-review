import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface ReviewDecision {
  seq: number
  lang: string
  decision: 'accepted' | 'rejected'
  glosses?: string[][]
  reviewedAt: number
}

interface Schema extends DBSchema {
  decisions: {
    key: number
    value: ReviewDecision
  }
  settings: {
    key: string
    value: string
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<Schema>('sumatora-review', 1, {
      upgrade(db) {
        db.createObjectStore('decisions', { keyPath: 'seq' })
        db.createObjectStore('settings')
      },
    })
  }
  return dbPromise
}

export async function getDecision(seq: number): Promise<ReviewDecision | undefined> {
  const db = await getDB()
  return db.get('decisions', seq)
}

export async function getDecidedSeqs(): Promise<Set<number>> {
  const db = await getDB()
  const keys = await db.getAllKeys('decisions')
  return new Set(keys)
}

export async function recordDecision(decision: ReviewDecision): Promise<void> {
  const db = await getDB()
  await db.put('decisions', decision)
}

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDB()
  return db.get('settings', key)
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB()
  await db.put('settings', value, key)
}
