import React from 'react';
import { 
  Users, 
  Snowflake, 
  Zap, 
  Flame, 
  UserCheck,
  LayoutDashboard,
  CalendarDays,
  Swords
} from 'lucide-react';

export type TabType = 
  | 'dashboard' 
  | 'agenda'
  | 'contacts' 
  | 'frio' 
  | 'vivo' 
  | 'quente' 
  | 'clientes'
  | 'morto' 
  | 'sync';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingSyncCount?: number;
  contactCount: number;
  pendingTaskCount?: number;
  overdueTaskCount?: number;
  pendingWarZoneCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  contactCount,
  pendingTaskCount = 0,
  overdueTaskCount = 0,
  pendingWarZoneCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'agenda' as TabType, 
      label: 'Agenda', 
      icon: CalendarDays, 
      badge: (pendingTaskCount + overdueTaskCount) > 0 ? (pendingTaskCount + overdueTaskCount) : undefined,
      badgeColor: overdueTaskCount > 0 ? 'bg-rose-600' : 'bg-indigo-600'
    },
    { 
      id: 'contacts' as TabType, 
      label: 'Zona de Guerra', 
      icon: Swords, 
      badge: pendingWarZoneCount > 0 ? pendingWarZoneCount : (contactCount > 0 ? contactCount : undefined),
      badgeColor: pendingWarZoneCount > 0 ? 'bg-amber-600 animate-pulse' : 'bg-slate-700'
    },
    { id: 'frio' as TabType, label: 'Frio', icon: Snowflake },
    { id: 'vivo' as TabType, label: 'Vivo', icon: Zap },
    { id: 'quente' as TabType, label: 'Quente', icon: Flame },
    { id: 'clientes' as TabType, label: 'Clientes', icon: UserCheck },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors w-full max-w-full shadow-lg"
      style={{
        paddingTop: '0.35rem',
        paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 0.5rem), 1rem)',
      }}
    >
      <div className="max-w-xl mx-auto px-1 sm:px-2 flex items-center justify-around gap-0.5 sm:gap-1 w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'clientes' && activeTab === 'morto');
          const isWarZone = tab.id === 'contacts';
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 sm:px-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? isWarZone
                    ? 'text-amber-600 dark:text-amber-400 font-bold scale-102 bg-amber-50/80 dark:bg-amber-950/40'
                    : 'text-indigo-600 dark:text-indigo-400 font-bold scale-102 bg-indigo-50/80 dark:bg-indigo-950/40'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.75px]'} ${isWarZone && !isActive ? 'text-amber-600 dark:text-amber-400' : ''}`} />
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold text-white shadow-xs ${tab.badgeColor || 'bg-indigo-600'}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 whitespace-nowrap font-medium ${isWarZone && !isActive ? 'font-bold text-slate-700 dark:text-slate-300' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className={`absolute bottom-0 w-5 sm:w-6 h-0.5 rounded-full ${isWarZone ? 'bg-amber-600 dark:bg-amber-400' : 'bg-indigo-600 dark:bg-indigo-400'}`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
