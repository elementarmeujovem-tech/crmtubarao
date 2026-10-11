import React, { useState, useMemo } from 'react';
import { 
  SavedEvent, 
  EventCategory, 
  EVENT_CATEGORIES_CONFIG 
} from '../../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Building2, 
  Filter, 
  CalendarCheck,
  CalendarDays,
  Plus,
  X
} from 'lucide-react';

interface EventCalendarViewProps {
  savedEvents: SavedEvent[];
  onSelectEvent: (event: SavedEvent) => void;
  onOpenSearchModal: () => void;
  onOpenAddToPersonalAgenda: (event: SavedEvent) => void;
}

export const EventCalendarView: React.FC<EventCalendarViewProps> = ({
  savedEvents,
  onSelectEvent,
  onOpenSearchModal,
  onOpenAddToPersonalAgenda,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | EventCategory>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'IN_AGENDA' | 'NOT_IN_AGENDA' | 'HIGH_SCORE'>('ALL');
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Filtered events
  const filteredEvents = useMemo(() => {
    return savedEvents.filter(e => {
      if (selectedCategoryFilter !== 'ALL' && e.category !== selectedCategoryFilter) return false;
      if (selectedStatusFilter === 'IN_AGENDA' && !e.addedToPersonalAgenda) return false;
      if (selectedStatusFilter === 'NOT_IN_AGENDA' && e.addedToPersonalAgenda) return false;
      if (selectedStatusFilter === 'HIGH_SCORE' && e.commercialScore < 80) return false;
      return true;
    });
  }, [savedEvents, selectedCategoryFilter, selectedStatusFilter]);

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, SavedEvent[]>();
    filteredEvents.forEach(evt => {
      const dateKey = evt.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(evt);
    });
    return map;
  }, [filteredEvents]);

  // Calendar matrix computation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: SavedEvent[];
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // Current month days
    const todayStr = new Date().toISOString().split('T')[0];
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // Next month padding (complete to multiple of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(currentYear, currentMonth + 1, d);
        const dateStr = nextDate.toISOString().split('T')[0];
        days.push({
          dateStr,
          dayNumber: d,
          isCurrentMonth: false,
          isToday: false,
          events: eventsByDate.get(dateStr) || [],
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, eventsByDate]);

  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // Selected day events for drawer/modal
  const selectedDayEvents = selectedDayDate ? eventsByDate.get(selectedDayDate) || [] : [];

  return (
    <div className="space-y-3 sm:space-y-4 pb-20 font-sans animate-fadeIn w-full max-w-full">
      {/* Top Banner & Search Action */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-purple-800/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-purple-600 text-white">
                <CalendarDays className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Calendário Exclusivo de Eventos Comerciais
              </h2>
            </div>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Feiras, fóruns e rodadas de negócios salvas. Transfira para sua agenda pessoal quando desejar participar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSearchModal}
              className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Buscar Eventos Externos</span>
            </button>
          </div>
        </div>

        {/* Month Navigation Bar */}
        <div className="mt-4 pt-3 border-t border-purple-800/50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-800 text-white border border-purple-700/60 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white px-1">
              {capitalizedMonth}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-800 text-white border border-purple-700/60 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 rounded-xl bg-purple-950/80 hover:bg-purple-800 text-purple-200 text-xs font-bold border border-purple-700/60 ml-1 transition-colors cursor-pointer"
            >
              Hoje
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-purple-200">
            <span>Total Salvos: <strong className="text-white font-extrabold">{savedEvents.length}</strong></span>
            <span>• Na Minha Agenda: <strong className="text-emerald-300 font-extrabold">{savedEvents.filter(e => e.addedToPersonalAgenda).length}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter Ribbons */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs shadow-xs">
        {/* Status Filter */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={() => setSelectedStatusFilter('ALL')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                selectedStatusFilter === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todos ({savedEvents.length})
            </button>

            <button
              onClick={() => setSelectedStatusFilter('IN_AGENDA')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedStatusFilter === 'IN_AGENDA'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Na Minha Agenda ({savedEvents.filter(e => e.addedToPersonalAgenda).length})</span>
            </button>

            <button
              onClick={() => setSelectedStatusFilter('NOT_IN_AGENDA')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedStatusFilter === 'NOT_IN_AGENDA'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
              }`}
            >
              <CalendarCheck className="w-3 h-3" />
              <span>Apenas em Eventos ({savedEvents.filter(e => !e.addedToPersonalAgenda).length})</span>
            </button>

            <button
              onClick={() => setSelectedStatusFilter('HIGH_SCORE')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedStatusFilter === 'HIGH_SCORE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Alta Prioridade (80+)</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Todas Categorias
          </button>

          {Object.entries(EVENT_CATEGORIES_CONFIG).map(([key, cfg]) => {
            const cat = key as EventCategory;
            const isSel = selectedCategoryFilter === cat;
            const count = savedEvents.filter(e => e.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 border ${
                  isSel
                    ? 'ring-2 ring-purple-500 shadow-xs font-black'
                    : 'opacity-75 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: cfg.bg ? undefined : '#f3f4f6',
                  color: cfg.badgeHex,
                  borderColor: cfg.badgeHex,
                }}
              >
                <span>{cfg.label}</span>
                {count > 0 && <span className="text-[10px] opacity-80 font-black">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-center text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-1.5 sm:py-2.5">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, idx) => (
            <span key={dayName}>
              <span className="sm:hidden">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][idx]}</span>
              <span className="hidden sm:inline">{dayName}</span>
            </span>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/60 w-full min-w-0">
          {calendarDays.map((day, idx) => {
            const hasEvents = day.events.length > 0;
            const isDense = day.events.length > 3;
            const mobileH = isDense ? Math.max(60, 22 + day.events.length * 16) : 52;
            const desktopH = isDense ? Math.max(125, 48 + day.events.length * 26) : 115;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (hasEvents) {
                    setSelectedDayDate(selectedDayDate === day.dateStr ? null : day.dateStr);
                  }
                }}
                style={{ minHeight: `clamp(${mobileH}px, 9vw, ${desktopH}px)` }}
                className={`p-1 sm:p-2 flex flex-col justify-between transition-colors relative cursor-pointer min-w-0 overflow-hidden ${
                  !day.isCurrentMonth
                    ? 'bg-slate-50/50 dark:bg-slate-950/40 opacity-40'
                    : day.isToday
                    ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                } ${selectedDayDate === day.dateStr ? 'ring-2 ring-purple-500 z-10' : ''}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black ${
                      day.isToday
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {hasEvents && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      {day.events.length}
                    </span>
                  )}
                </div>

                {/* Day Events List - cabe todos no mesmo quadrado com altura proporcional */}
                <div className={`mt-1 flex-1 ${isDense ? 'space-y-0.5' : 'space-y-1'}`}>
                  {day.events.map(evt => {
                    const catCfg = EVENT_CATEGORIES_CONFIG[evt.category] || EVENT_CATEGORIES_CONFIG.business;

                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(evt);
                        }}
                        className={`rounded-lg border transition-all truncate hover:scale-102 cursor-pointer shadow-2xs ${
                          isDense ? 'p-1 text-[9px]' : 'p-1 sm:p-1.5 text-[10px]'
                        } ${
                          evt.addedToPersonalAgenda
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-purple-50/80 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/80 text-purple-950 dark:text-purple-200'
                        }`}
                        title={`${evt.title} (${evt.commercialScore}/100)`}
                      >
                        <div className="flex items-center gap-1 font-bold truncate">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: catCfg.badgeHex }}
                          />
                          <span className="truncate">{evt.title}</span>
                          {evt.addedToPersonalAgenda && (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0 ml-auto" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events Drawer (if clicked) */}
      {selectedDayDate && selectedDayEvents.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 shadow-md space-y-3 animate-fadeIn text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-600" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Eventos em {new Date(`${selectedDayDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <button
              onClick={() => setSelectedDayDate(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {selectedDayEvents.map(evt => {
              const catCfg = EVENT_CATEGORIES_CONFIG[evt.category] || EVENT_CATEGORIES_CONFIG.business;

              return (
                <div
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-2 hover:border-purple-400 transition-all cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}>
                        {catCfg.label}
                      </span>
                      <span className="text-[10.5px] font-black text-emerald-600 dark:text-emerald-400">
                        Score: {evt.commercialScore}/100
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {evt.title}
                    </h4>

                    {evt.venue && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{evt.venue} {evt.city ? `• ${evt.city}` : ''}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    {evt.addedToPersonalAgenda ? (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Na minha agenda</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddToPersonalAgenda(evt);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar à minha agenda</span>
                      </button>
                    )}

                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline">
                      Ver detalhes →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State when no events exist yet */}
      {savedEvents.length === 0 && (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 p-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <CalendarDays className="w-7 h-7" />
          </div>
          <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
            Nenhum evento adicionado ao seu calendário ainda
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Pesquise feiras, congressos e eventos comerciais próximos ao seu CEP ou em âmbito nacional, e adicione os mais promissores a esta área.
          </p>
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Pesquisar Eventos Agora</span>
          </button>
        </div>
      )}
    </div>
  );
};
