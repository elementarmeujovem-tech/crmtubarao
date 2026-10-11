import React, { useState, useEffect } from 'react';
import { 
  EventSearchConfig, 
  ExternalEvent, 
  EventCategory, 
  EventSearchHistory,
  EVENT_CATEGORIES_CONFIG 
} from '../../types';
import { 
  validateAndGeocodeCep, 
  executeEventSearch, 
  SearchExecutionResult 
} from '../../services/eventSearchService';
import { 
  X, 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  Calendar, 
  Clock, 
  Building2, 
  Sparkles, 
  ExternalLink, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  EyeOff, 
  Info,
  CalendarDays,
  ShieldCheck,
  Compass
} from 'lucide-react';

interface EventSearchModalProps {
  initialConfig: EventSearchConfig;
  savedExternalEventIds: Set<string>;
  onClose: () => void;
  onSaveConfig: (config: Partial<EventSearchConfig>) => void;
  onSelectEventToSave: (event: ExternalEvent) => void;
  onAddHistoryEntry: (entry: Omit<EventSearchHistory, 'id' | 'executedAt'>) => void;
  searchHistory: EventSearchHistory[];
}

type ModalTab = 'search' | 'config' | 'history';

export const EventSearchModal: React.FC<EventSearchModalProps> = ({
  initialConfig,
  savedExternalEventIds,
  onClose,
  onSaveConfig,
  onSelectEventToSave,
  onAddHistoryEntry,
  searchHistory,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('search');

  // Config state
  const [cep, setCep] = useState(initialConfig.cep || '');
  const [cepStatus, setCepStatus] = useState<{
    validating: boolean;
    valid: boolean;
    city?: string;
    state?: string;
    error?: string;
  }>({
    validating: false,
    valid: Boolean(initialConfig.city),
    city: initialConfig.city,
    state: initialConfig.state,
  });
  const [radiusKm, setRadiusKm] = useState<number>(initialConfig.radiusKm || 50);
  const [periodShortcut, setPeriodShortcut] = useState<'7d' | '30d' | '90d' | 'custom'>(initialConfig.periodShortcut || '90d');
  const [startDate, setStartDate] = useState(initialConfig.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialConfig.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(
    initialConfig.categories && initialConfig.categories.length > 0 
      ? initialConfig.categories 
      : Object.keys(EVENT_CATEGORIES_CONFIG) as EventCategory[]
  );
  const [autoSearchEnabled, setAutoSearchEnabled] = useState(initialConfig.autoSearchEnabled || false);

  // Search execution state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchExecutionResult | null>(null);
  const [ignoredEventIds, setIgnoredEventIds] = useState<Set<string>>(new Set());
  const [expandedReasonsEventId, setExpandedReasonsEventId] = useState<string | null>(null);

  // Filter inside results
  const [resultsFilterText, setResultsFilterText] = useState('');
  const [resultsCategoryFilter, setResultsCategoryFilter] = useState<'ALL' | EventCategory>('ALL');

  // Location not configured banner dismiss
  const [dismissLocationBanner, setDismissLocationBanner] = useState(false);

  // Sync date shortcuts
  const handlePeriodShortcutChange = (shortcut: '7d' | '30d' | '90d' | 'custom') => {
    setPeriodShortcut(shortcut);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setStartDate(todayStr);

    if (shortcut === '7d') {
      const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      setEndDate(in7.toISOString().split('T')[0]);
    } else if (shortcut === '30d') {
      const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      setEndDate(in30.toISOString().split('T')[0]);
    } else if (shortcut === '90d') {
      const in90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      setEndDate(in90.toISOString().split('T')[0]);
    }
  };

  // Validate CEP on blur or submit
  const handleValidateCep = async (targetCep: string) => {
    const clean = targetCep.replace(/\D/g, '');
    if (!clean) {
      setCpStateEmpty();
      return;
    }
    setCepStatus({ validating: true, valid: false });
    const res = await validateAndGeocodeCep(clean);
    if (res.valid) {
      setCepStatus({
        validating: false,
        valid: true,
        city: res.city,
        state: res.state,
      });
      // Save updated location
      onSaveConfig({
        cep: clean,
        city: res.city,
        state: res.state,
        neighborhood: res.neighborhood,
        lat: res.lat,
        lng: res.lng,
      });
    } else {
      setCepStatus({
        validating: false,
        valid: false,
        error: res.error || 'CEP não encontrado.',
      });
    }
  };

  const setCpStateEmpty = () => {
    setCepStatus({ validating: false, valid: false });
    onSaveConfig({
      cep: '',
      city: undefined,
      state: undefined,
      lat: undefined,
      lng: undefined,
    });
  };

  const handleToggleCategory = (cat: EventCategory) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length === 1) return; // keep at least 1
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(Object.keys(EVENT_CATEGORIES_CONFIG) as EventCategory[]);
  };

  const handleClearCategories = () => {
    setSelectedCategories([]);
  };

  // Save config settings
  const handleSaveAllConfig = () => {
    onSaveConfig({
      radiusKm,
      periodShortcut,
      startDate,
      endDate,
      categories: selectedCategories,
      autoSearchEnabled,
    });
  };

  // Run the manual search
  const handleExecuteSearch = async () => {
    setIsSearching(true);
    setExpandedReasonsEventId(null);

    const configToUse: EventSearchConfig = {
      ...initialConfig,
      cep: cep.replace(/\D/g, ''),
      radiusKm,
      periodShortcut,
      startDate,
      endDate,
      categories: selectedCategories,
      autoSearchEnabled,
      city: cepStatus.city || initialConfig.city,
      state: cepStatus.state || initialConfig.state,
      lat: initialConfig.lat,
      lng: initialConfig.lng,
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await executeEventSearch(configToUse);
      setSearchResult(res);

      // Register history
      onAddHistoryEntry({
        cep: configToUse.cep || undefined,
        city: configToUse.city || undefined,
        radiusKm: configToUse.radiusKm,
        startDate: configToUse.startDate,
        endDate: configToUse.endDate,
        categories: configToUse.categories,
        sourcesConsulted: res.sourcesConsulted,
        failedSources: res.failedSources,
        resultsCount: res.totalFound,
        duplicatesCount: res.duplicatesCount,
        status: res.status,
        errorMessage: res.status === 'failed' ? res.message : undefined,
      });

      // Also persist updated config
      handleSaveAllConfig();
    } catch (err: any) {
      console.error('Error executing search:', err);
      setSearchResult({
        results: [],
        sourcesConsulted: ['Sympla (Eventos Públicos)', 'Eventbrite Brasil', 'Feiras Oficiais Brasil'],
        failedSources: ['Todas as fontes externas'],
        duplicatesCount: 0,
        totalFound: 0,
        status: 'failed',
        message: `Falha na consulta às fontes: ${err.message || 'Erro de rede'}`
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Initial trigger if not searched yet
  useEffect(() => {
    if (!searchResult && selectedCategories.length > 0) {
      handleExecuteSearch();
    }
  }, []);

  // Filtered results to render
  const visibleResults = (searchResult?.results || []).filter(evt => {
    if (ignoredEventIds.has(evt.id)) return false;
    if (resultsCategoryFilter !== 'ALL' && evt.category !== resultsCategoryFilter) return false;
    if (resultsFilterText.trim()) {
      const term = resultsFilterText.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(term);
      const matchVenue = (evt.venueName || '').toLowerCase().includes(term);
      const matchCity = (evt.city || '').toLowerCase().includes(term);
      const matchDesc = (evt.description || '').toLowerCase().includes(term);
      if (!matchTitle && !matchVenue && !matchCity && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[94vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-indigo-600 text-white shadow-md">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
                <span>Busca Inteligente de Eventos Comerciais</span>
              </h2>
              <p className="text-xs text-indigo-200/80">
                Descoberta de feiras, fóruns, exposições e rodadas de negócios para prospecção
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-2 flex-wrap shrink-0 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Resultados & Pesquisa</span>
              {searchResult && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                  {visibleResults.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configuração (CEP, Raio & Filtros)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico ({searchHistory.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExecuteSearch}
            disabled={isSearching}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
            <span>{isSearching ? 'Pesquisando...' : 'Pesquisar eventos agora'}</span>
          </button>
        </div>

        {/* Tab 1: SEARCH & RESULTS */}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Location Not Configured Notice (Per specification Section 5) */}
            {!cep && !dismissLocationBanner && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start justify-between gap-3 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs text-amber-900 dark:text-amber-200">
                      Localização ainda não configurada
                    </h4>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                      Defina um CEP de referência para pesquisar eventos próximos e calcular as distâncias com exatidão. Você pode configurar agora ou deixar para depois.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('config')}
                        className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
                      >
                        Configurar CEP
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissLocationBanner(true)}
                        className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-bold text-[11px] cursor-pointer"
                      >
                        Definir depois
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDismissLocationBanner(true)}
                  className="text-amber-500 hover:text-amber-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Current Active Search Criteria Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 flex-wrap">
                <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  {cep ? `CEP: ${cep.slice(0, 5)}-${cep.slice(5)} (${cepStatus.city || 'Localizado'}) • Raio ${radiusKm} km` : 'Localização: Nacional / Geral'}
                </span>
                <span>• Período: <strong>{new Date(`${startDate}T12:00:00`).toLocaleDateString('pt-BR')}</strong> até <strong>{new Date(`${endDate}T12:00:00`).toLocaleDateString('pt-BR')}</strong></span>
                <span>• Categorias ativas: <strong>{selectedCategories.length} de 8</strong></span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Ajustar filtros
              </button>
            </div>

            {/* Results Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={resultsFilterText}
                  onChange={(e) => setResultsFilterText(e.target.value)}
                  placeholder="Filtrar por nome, local ou cidade nos resultados..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={resultsCategoryFilter}
                onChange={(e) => setResultsCategoryFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="ALL">Todas as Categorias</option>
                {Object.entries(EVENT_CATEGORIES_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {/* Sources Consulted & Status Transparency */}
            {searchResult && (
              <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Fontes verificadas:</span>
                  {searchResult.sourcesConsulted.map((src, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-[10px]">
                      {src}
                    </span>
                  ))}
                  {searchResult.duplicatesCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      • {searchResult.duplicatesCount} duplicidade(s) tratadas
                    </span>
                  )}
                </div>
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                  {searchResult.message}
                </span>
              </div>
            )}

            {/* Results Grid */}
            {isSearching ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto animate-bounce">
                  <Compass className="w-6 h-6 animate-spin" />
                </div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Consultando fontes oficiais de eventos...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Verificando Sympla, Eventbrite e calendários de feiras empresariais com potencial comercial.
                </p>
              </div>
            ) : visibleResults.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 p-6">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                  Nenhum evento encontrado
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tente expandir o raio de quilômetros, ampliar o período de dias ou selecionar mais categorias na aba de configurações.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs shadow-sm cursor-pointer"
                >
                  Abrir Configurações de Busca
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {visibleResults.map((event) => {
                  const catCfg = EVENT_CATEGORIES_CONFIG[event.category] || EVENT_CATEGORIES_CONFIG.business;
                  const isAlreadySaved = savedExternalEventIds.has(event.id);
                  const isReasonsOpen = expandedReasonsEventId === event.id;

                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-3xl border transition-all flex flex-col justify-between space-y-3 relative ${
                        isAlreadySaved
                          ? 'bg-purple-50/30 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/80 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Top Line: Category + Commercial Score */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}>
                            {catCfg.label}
                          </span>

                          <button
                            type="button"
                            onClick={() => setExpandedReasonsEventId(isReasonsOpen ? null : event.id)}
                            className="flex items-center gap-1 cursor-pointer"
                            title="Clique para ver os critérios da pontuação"
                          >
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>{event.commercialScore}/100</span>
                              {isReasonsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </span>
                          </button>
                        </div>

                        {/* Event Title */}
                        <h4 className="font-black text-sm text-slate-900 dark:text-white leading-snug">
                          {event.title}
                        </h4>

                        {/* Location and Distance */}
                        <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>
                              {new Date(`${event.dateStr}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                              {event.timeStr ? ` às ${event.timeStr}` : ''}
                            </span>
                          </div>

                          {event.venueName && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{event.venueName} {event.city ? `(${event.city})` : ''}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {typeof event.distanceKm === 'number' 
                                ? `${event.distanceKm} km de distância em linha reta`
                                : 'Distância não calculada (Sem CEP de referência)'}
                            </span>
                          </div>
                        </div>

                        {/* Score Reasons Dropdown Accordion */}
                        {isReasonsOpen && event.scoreReasons && (
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10.5px] space-y-1 animate-fadeIn">
                            <span className="font-black text-slate-500 uppercase tracking-wider block">
                              Justificativa da Pontuação Comercial:
                            </span>
                            {event.scoreReasons.map((r, idx) => (
                              <p key={idx} className="text-slate-700 dark:text-slate-300 leading-tight">
                                • {r}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Short Description */}
                        {event.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed pt-0.5">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Card Bottom: Source Link + Action Buttons */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        {event.originalUrl ? (
                          <a
                            href={event.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title={`Abrir página em ${event.source}`}
                          >
                            <span>{event.source}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">{event.source}</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIgnoredEventIds(prev => new Set([...prev, event.id]))}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Ignorar evento"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>

                          {isAlreadySaved ? (
                            <span className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 font-extrabold text-[11px] flex items-center gap-1 border border-purple-300/50">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Salvo em Eventos</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectEventToSave(event)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[11px] shadow-sm flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Adicionar a Eventos</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: CONFIGURATION */}
        {activeTab === 'config' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
            {/* 1. Localização */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    1. Localização & Raio de Pesquisa
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">CEP é opcional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CEP de Referência
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      onBlur={() => handleValidateCep(cep)}
                      placeholder="Ex: 01310-100"
                      maxLength={9}
                      className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleValidateCep(cep)}
                      disabled={cepStatus.validating}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                    >
                      {cepStatus.validating ? 'Verificando...' : 'Validar'}
                    </button>
                  </div>

                  {cepStatus.valid && cepStatus.city && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{cepStatus.city} / {cepStatus.state}</span>
                    </p>
                  )}
                  {cepStatus.error && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1">
                      {cepStatus.error}
                    </p>
                  )}
                  {!cep && (
                    <p className="text-[10.5px] text-slate-400 mt-1">
                      Sem CEP, a busca retornará eventos de abrangência estadual/nacional.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Raio em Quilômetros
                    </label>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">
                      {radiusKm} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    step={10}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                    <span>10 km</span>
                    <span>50 km (Padrão)</span>
                    <span>150 km</span>
                    <span>300 km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Período */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  2. Período da Pesquisa
                </h3>
              </div>

              {/* Shortcuts */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePeriodShortcutChange('7d')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    periodShortcut === '7d' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Próximos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodShortcutChange('30d')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    periodShortcut === '30d' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Próximos 30 dias
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodShortcutChange('90d')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    periodShortcut === '90d' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Próximos 90 dias (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodShortcutChange('custom')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    periodShortcut === 'custom' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPeriodShortcut('custom');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPeriodShortcut('custom');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 3. Categorias (8 categorias com Selecionar Todas e Limpar) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    3. Categorias de Interesse Comercial ({selectedCategories.length} de 8)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Selecionar todas
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleClearCategories}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {Object.entries(EVENT_CATEGORIES_CONFIG).map(([key, cfg]) => {
                  const cat = key as EventCategory;
                  const isChecked = selectedCategories.includes(cat);

                  return (
                    <label
                      key={cat}
                      className={`p-3 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-600 shadow-xs' 
                          : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCategory(cat)}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <span className={`text-[11px] font-extrabold block ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {cfg.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. Automação Opcional (Desativada por padrão) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Automação de Pesquisa Periódica
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Desativada por padrão. Notifica periodicamente caso novas feiras ou eventos sejam identificados na região.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoSearchEnabled}
                  onChange={(e) => setAutoSearchEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveAllConfig();
                  setActiveTab('search');
                  handleExecuteSearch();
                }}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md cursor-pointer transition-all active:scale-95"
              >
                Salvar Configurações e Pesquisar
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: SEARCH HISTORY */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
            {searchHistory.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-bold">Nenhum histórico de pesquisa registrado ainda.</p>
              </div>
            ) : (
              searchHistory.map((h) => (
                <div
                  key={h.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {new Date(h.executedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
                      {h.status === 'completed' ? 'Concluída' : h.status === 'partial' ? 'Parcial' : 'Sem resultados'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                    <p>
                      Local: <strong>{h.city || (h.cep ? `CEP ${h.cep}` : 'Geral')}</strong> • Raio: <strong>{h.radiusKm} km</strong>
                    </p>
                    <p>
                      Resultados encontrados: <strong className="text-emerald-600 dark:text-emerald-400">{h.resultsCount}</strong>
                      {h.duplicatesCount > 0 && ` • Duplicidades: ${h.duplicatesCount}`}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Fontes: {h.sourcesConsulted.join(', ')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
