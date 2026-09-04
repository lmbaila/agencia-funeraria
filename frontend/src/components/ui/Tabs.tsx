import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
  defaultTab?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active);

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              active === tab.key
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeTab?.content}</div>
    </div>
  );
}
