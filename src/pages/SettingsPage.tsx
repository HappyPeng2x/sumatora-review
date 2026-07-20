import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../lib/db'

export function SettingsPage() {
  const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSetting('githubToken').then((t) => {
      if (t) setToken(t)
    })
  }, [])

  async function save() {
    await setSetting('githubToken', token)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="p-4 flex flex-col gap-3 max-w-md">
      <h2 className="text-lg font-medium text-slate-100">GitHub token</h2>
      <p className="text-sm text-slate-400">
        A fine-grained personal access token scoped to <code>contents: write</code> on{' '}
        <code>HappyPeng2x/SumatoraIndex</code> only. Accepting a translation writes a patch file there;
        nothing else in this app needs write access anywhere.
      </p>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="github_pat_..."
        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        onClick={save}
        className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg py-2 font-medium"
      >
        {saved ? 'Saved' : 'Save'}
      </button>
      <p className="text-xs text-slate-500">
        Stored only in this browser's IndexedDB. Never sent anywhere except api.github.com.
      </p>
    </div>
  )
}
