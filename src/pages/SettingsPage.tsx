import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../lib/db'

export function SettingsPage() {
  const [token, setToken] = useState('')
  const [tokenSaved, setTokenSaved] = useState(false)
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiSaved, setGeminiSaved] = useState(false)

  useEffect(() => {
    getSetting('githubToken').then((t) => {
      if (t) setToken(t)
    })
    getSetting('geminiApiKey').then((k) => {
      if (k) setGeminiKey(k)
    })
  }, [])

  async function saveToken() {
    await setSetting('githubToken', token)
    setTokenSaved(true)
    setTimeout(() => setTokenSaved(false), 1500)
  }

  async function saveGeminiKey() {
    await setSetting('geminiApiKey', geminiKey)
    setGeminiSaved(true)
    setTimeout(() => setGeminiSaved(false), 1500)
  }

  return (
    <div className="p-4 flex flex-col gap-8 max-w-md">
      <div className="flex flex-col gap-3">
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
          onClick={saveToken}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg py-2 font-medium"
        >
          {tokenSaved ? 'Saved' : 'Save'}
        </button>
        <p className="text-xs text-slate-500">
          Stored only in this browser's IndexedDB. Never sent anywhere except api.github.com.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-slate-100">Gemini API key</h2>
        <p className="text-sm text-slate-400">
          Optional -- enables the "Ask Gemini" button on a draft for a second opinion from a larger
          model, on demand only, never automatic. Get a free key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
            aistudio.google.com/apikey
          </a>
          .
        </p>
        <input
          type="password"
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
          placeholder="AIza..."
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={saveGeminiKey}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg py-2 font-medium"
        >
          {geminiSaved ? 'Saved' : 'Save'}
        </button>
        <p className="text-xs text-slate-500">
          Stored only in this browser's IndexedDB. Never sent anywhere except generativelanguage.googleapis.com,
          and only when you press "Ask Gemini".
        </p>
      </div>
    </div>
  )
}
