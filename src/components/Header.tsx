import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Plus, 
  Sun, 
  Moon, 
  Sparkles,
  Smartphone,
  Users,
  Snowflake,
  Zap, 
  Flame, 
  UserCheck,
  LayoutDashboard,
  CalendarDays,
  Swords,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { SyncState, User } from '../types';
import { TabType } from './BottomNav';

interface HeaderProps {
  syncState: SyncState;
  darkMode: boolean;
  currentUser?: User | null;
  activeTab?: TabType;
  onSelectTab?: (tab: TabType) => void;
  onToggleDarkMode: () => void;
  onOpenNewContactModal: () => void;
  onOpenSyncModal: () => void;
  onOpenApkModal: () => void;
  onOpenUserProfileModal?: () => void;
  onLogout?: () => void;
  onManualSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  syncState,
  darkMode,
  currentUser,
  activeTab,
  onSelectTab,
  onToggleDarkMode,
  onOpenNewContactModal,
  onOpenSyncModal,
  onOpenApkModal,
  onOpenUserProfileModal,
  onLogout,
  onManualSync,
}) => {
  const topTabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda' as TabType, label: 'Agenda', icon: CalendarDays },
    { id: 'contacts' as TabType, label: 'Zona de Guerra', icon: Swords },
    { id: 'frio' as TabType, label: 'Frio', icon: Snowflake },
    { id: 'vivo' as TabType, label: 'Vivo', icon: Zap },
    { id: 'quente' as TabType, label: 'Quente', icon: Flame },
    { id: 'clientes' as TabType, label: 'Clientes', icon: UserCheck },
  ];

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors w-full shadow-xs"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.35rem), 0.75rem)',
      }}
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 pb-2 sm:pb-2.5 flex items-center justify-between gap-1.5 sm:gap-3 min-w-0">
        {/* Logo & Title */}
        <div 
          onClick={() => onSelectTab?.('dashboard')}
          className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
          title="Ir para o Dashboard"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-xs shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-none truncate">
                CRM<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
              </h1>
              <span className="text-[8px] sm:text-[9px] font-black px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                PRO
              </span>
            </div>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block truncate">
              Gestão de Vendas & Funil
            </p>
          </div>
        </div>

        {/* Center Top Tab Navigation for Desktop/Tablet */}
        {onSelectTab && (
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            {topTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id || (t.id === 'clientes' && activeTab === 'morto');
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Network & Sync Badge & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Status Indicator Button */}
          <button
            onClick={onOpenSyncModal}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ${
              syncState.isOnline
                ? syncState.pendingCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse'
            }`}
            title="Clique para gerenciar sincronização e dados offline"
          >
            {syncState.isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            )}
            <span className="hidden md:inline">
              {syncState.isOnline
                ? syncState.pendingCount > 0
                  ? `${syncState.pendingCount} pendente(s)`
                  : 'Online'
                : 'Offline'}
            </span>
            {syncState.isOnline && syncState.pendingCount > 0 && (
              <span className="md:hidden text-[9px] font-black text-amber-700 dark:text-amber-300">
                {syncState.pendingCount}
              </span>
            )}
            {syncState.isSyncing && (
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-500 shrink-0" />
            )}
          </button>

          {/* Quick APK/PWA Modal trigger */}
          <button
            onClick={onOpenApkModal}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Instalar APK</span>
          </button>

          {/* User Account / Profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <button
                onClick={onOpenUserProfileModal}
                className="flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                title="Meu Perfil / Trocar Foto / Senha"
              >
                <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] overflow-hidden shrink-0">
                  {currentUser.avatarUrl ? (
                    <img 
                      src={currentUser.avatarUrl} 
                      alt={currentUser.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    currentUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold leading-tight truncate max-w-[90px]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-tight">
                    {currentUser.role ? currentUser.role.split(' ')[0] : 'Conta'}
                  </span>
                </div>
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Sair da Conta (Logout)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Alternar Tema Claro/Escuro"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenNewContactModal}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-xs shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline font-black">Adicionar Cliente</span>
            <span className="sm:hidden font-black">Cliente</span>
          </button>
        </div>
      </div>
    </header>
  );
};

