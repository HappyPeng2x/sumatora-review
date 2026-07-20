export type Tab = 'review' | 'settings'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'review', label: 'Review' },
  { id: 'settings', label: 'Settings' },
]

export function TabBar({ activeTab, onTabChange }: Props) {
  return (
    <nav
      className="bg-slate-800 border-t border-slate-700 flex flex-shrink-0"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === tab.id ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
