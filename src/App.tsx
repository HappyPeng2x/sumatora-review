import { useState } from 'react'
import { ReviewPage } from './pages/ReviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { TabBar, type Tab } from './components/TabBar'

const PAGE_TITLES: Record<Tab, string> = {
  review: 'Sumatora Review',
  settings: 'Settings',
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('review')

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <header
        className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex-shrink-0"
        style={{ paddingTop: 'calc(0.75rem + var(--safe-top))' }}
      >
        <h1 className="text-lg font-semibold">{PAGE_TITLES[activeTab]}</h1>
      </header>
      <main className="flex-1 overflow-hidden">
        {activeTab === 'review' && <ReviewPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
