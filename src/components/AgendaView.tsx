import React, { useState, useMemo, useEffect } from 'react';
import { 
  Contact, 
  Task, 
  TaskType, 
  Tag, 
  FunnelStage, 
  STAGE_CONFIG, 
  TASK_TYPE_CONFIG,
  SavedEvent,
  ExternalEvent,
  EventSearchConfig,
  EventSearchHistory
} from '../types';
import { getWhatsAppUrl } from '../utils/whatsapp';
import { getGoogleCalendarUrl, downloadIcsCalendar, toLocalDateString } from '../utils/calendarSync';
import { storageService } from '../services/storage';
import { EventCalendarView } from './events/EventCalendarView';
import { EventSearchModal } from './events/EventSearchModal';
import { EventDetailModal } from './events/EventDetailModal';
import { AddToEventsModal } from './events/AddToEventsModal';
import { AddToPersonalAgendaModal } from './events/AddToPersonalAgendaModal';
import { EditDealValueModal } from './EditDealValueModal';
import { ScheduleFollowUpModal } from './ScheduleFollowUpModal';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  PhoneCall, 
  MessageSquare, 
  RotateCcw, 
  CalendarCheck, 
  User, 
  Building2, 
  Edit3, 
  Check, 
  CalendarDays, 
  ListTodo, 
  Sparkles, 
  RefreshCw, 
  Download, 
  DollarSign, 
  X,
  MapPin,
  Mail,
  Users,
  Briefcase,
  FileText,
  ChevronDown,
  Trash2,
  CalendarRange,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface AgendaViewProps {
  contacts: Contact[];
  tags: Tag[];
  tasks: Task[];
  onSelectContact: (contact: Contact) => void;
  onEditContact?: (contact: Contact) => void;
  onSaveTask: (taskData: Partial<Task> & { contactId?: string; title: string }) => void;
  onCompleteTask: (taskId: string, notes?: string, nextTask?: Partial<Task>) => void;
  onRescheduleTask: (taskId: string, newDate: string, newTime?: string) => void;
  onOpenStageMovement: (contact: Contact, targetStage: FunnelStage) => void;
  onOpenQuickResponse: (contact: Contact) => void;
  onOpenNewContactModal: () => void;
  onEditDealValue?: (contact: Contact) => void;
  onUpdateFollowUp?: (contactId: string, followUpLabel: string, nextFollowUpDate: string, notes?: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onNavigateToWarZone?: () => void;
}

// Preset commercial reasons for scheduling leads
const COMMON_REASONS = [
  'Apresentação de Proposta',
  'Primeiro Contato / Qualificação',
  'Follow-up de Orçamento',
  'Reunião de Fechamento',
  'Visita Comercial Presencial',
  'Retorno de Dúvidas / Simulação',
  'Alinhamento com Decisor',
  'Envio de Documentação',
  'Pós-Venda / Relacionamento'
];

type AgendorPeriod = 'month' | 'week' | 'day';
type AgendorDisplayMode = 'calendar' | 'list';
type AgendorStatusFilter = 'pendentes' | 'finalizadas';

export const AgendaView: React.FC<AgendaViewProps> = ({
  contacts,
  tags,
  tasks,
  onSelectContact,
  onEditContact,
  onSaveTask,
  onCompleteTask,
  onRescheduleTask,
  onOpenStageMovement,
  onOpenQuickResponse,
  onOpenNewContactModal,
  onEditDealValue,
  onUpdateFollowUp,
  onDeleteTask,
  onNavigateToWarZone,
}) => {
  // Navigation & Display state inspired by Agendor
  const [period, setPeriod] = useState<AgendorPeriod>('month');
  const [displayMode, setDisplayMode] = useState<AgendorDisplayMode>('calendar');
  const [statusFilter, setStatusFilter] = useState<AgendorStatusFilter>('pendentes');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEventsSubtab, setIsEventsSubtab] = useState<boolean>(false);
  const [listDateScope, setListDateScope] = useState<'period' | 'all'>('period');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<'all' | FunnelStage>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | TaskType>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  // Eventos Comerciais State
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>(() => storageService.getSavedEvents());
  const [eventSearchConfig, setEventSearchConfig] = useState<EventSearchConfig>(() => storageService.getEventSearchConfig());
  const [eventSearchHistory, setEventSearchHistory] = useState<EventSearchHistory[]>(() => storageService.getEventSearchHistory());

  // Event Modals State
  const [isEventSearchModalOpen, setIsEventSearchModalOpen] = useState(false);
  const [selectedEventForAddToEvents, setSelectedEventForAddToEvents] = useState<ExternalEvent | null>(null);
  const [selectedSavedEventForDetail, setSelectedSavedEventForDetail] = useState<SavedEvent | null>(null);
  const [eventForAddToPersonalAgenda, setEventForAddToPersonalAgenda] = useState<SavedEvent | null>(null);

  // Detail Modal for a clicked Task / Lead in the calendar
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);

  // Schedule Lead / Task Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleContactId, setScheduleContactId] = useState<string>('');
  const [scheduleReason, setScheduleReason] = useState<string>('Apresentação de Proposta');
  const [scheduleCustomReason, setScheduleCustomReason] = useState<string>('');
  const [scheduleType, setScheduleType] = useState<TaskType>('call');
  const [scheduleDate, setScheduleDate] = useState<string>(() => toLocalDateString(new Date()));
  const [scheduleTime, setScheduleTime] = useState<string>('10:00');
  const [scheduleNotes, setScheduleNotes] = useState<string>('');

  // Follow-Up & Reschedule Modal State
  const [followUpModalContact, setFollowUpModalContact] = useState<Contact | null>(null);
  const [followUpModalTask, setFollowUpModalTask] = useState<Task | null>(null);

  // Internal Edit Deal Value Modal State
  const [internalEditDealContact, setInternalEditDealContact] = useState<Contact | null>(null);

  // Sincronização da Agenda
  const [isSyncingAgenda, setIsSyncingAgenda] = useState(false);
  const [syncFeedbackMessage, setSyncFeedbackMessage] = useState<string | null>(null);

  // Sync events on storage changes
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setSavedEvents(storageService.getSavedEvents());
      setEventSearchConfig(storageService.getEventSearchConfig());
      setEventSearchHistory(storageService.getEventSearchHistory());
    });
    return unsub;
  }, []);

  const handleSyncAllAgenda = async () => {
    setIsSyncingAgenda(true);
    setSyncFeedbackMessage(null);
    try {
      await storageService.syncAll();
      setSavedEvents(storageService.getSavedEvents());
      setSyncFeedbackMessage('Agenda 100% sincronizada com a nuvem!');
      setTimeout(() => setSyncFeedbackMessage(null), 3500);
    } catch {
      setSyncFeedbackMessage('Erro ao sincronizar. Verifique a conexão.');
      setTimeout(() => setSyncFeedbackMessage(null), 3500);
    } finally {
      setIsSyncingAgenda(false);
    }
  };

  const handleExportIcs = () => {
    downloadIcsCalendar(tasks, savedEvents);
  };

  const contactMap = useMemo(() => new Map<string, Contact>(contacts.map((c) => [c.id, c])), [contacts]);
  const tagMap = useMemo(() => new Map<string, Tag>(tags.map((t) => [t.id, t])), [tags]);

  const todayStr = useMemo(() => toLocalDateString(new Date()), []);
  const now = useMemo(() => new Date(), []);

  // Compute tasks with enriched contact info
  const enrichedTasks = useMemo(() => {
    return tasks.map((task) => {
      const contact = task.contactId ? contactMap.get(task.contactId) : undefined;
      const isOverdue = !task.completed && new Date(task.dueDateTime).getTime() < now.getTime() && task.date < todayStr;
      const isToday = !task.completed && task.date === todayStr;
      const isUpcoming = !task.completed && task.date > todayStr;

      return {
        ...task,
        contact,
        isOverdue,
        isToday,
        isUpcoming,
      };
    });
  }, [tasks, contactMap, now, todayStr]);

  // Compute Week bounds for current selectedDate
  const { weekStartStr, weekEndStr, weekStartDate, weekEndDate } = useMemo(() => {
    const start = new Date(selectedDate);
    const day = start.getDay(); // 0 is Sun
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return {
      weekStartStr: toLocalDateString(start),
      weekEndStr: toLocalDateString(end),
      weekStartDate: start,
      weekEndDate: end,
    };
  }, [selectedDate]);

  // Selected date as string
  const selectedDateStr = useMemo(() => toLocalDateString(selectedDate), [selectedDate]);
  const selectedYearMonthStr = useMemo(() => selectedDateStr.slice(0, 7), [selectedDateStr]);

  // Counts
  const pendingCount = enrichedTasks.filter((t) => !t.completed).length;
  const completedCount = enrichedTasks.filter((t) => t.completed).length;

  // Filter tasks by Status (Pendentes / Finalizadas) & user filters & active period if in list
  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter((task) => {
      // Agendor Status filter
      if (statusFilter === 'pendentes' && task.completed) return false;
      if (statusFilter === 'finalizadas' && !task.completed) return false;

      // Type filter
      if (selectedTypeFilter !== 'all' && task.type !== selectedTypeFilter) return false;

      // Contact & stage filter
      const contact = task.contact;
      if (selectedStageFilter !== 'all' && contact?.stage !== selectedStageFilter) return false;

      // Tag filter
      if (selectedTagFilter !== 'all' && (!contact || !contact.tagIds.includes(selectedTagFilter))) return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesReason = (task.reason || '').toLowerCase().includes(q);
        const matchesContact = (contact?.name || '').toLowerCase().includes(q);
        const matchesCompany = (contact?.company || task.company || '').toLowerCase().includes(q);
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesReason && !matchesContact && !matchesCompany && !matchesNotes) return false;
      }

      // If in list view and scope is 'period', filter strictly according to current period!
      if (displayMode === 'list' && listDateScope === 'period') {
        if (period === 'day' && task.date !== selectedDateStr) return false;
        if (period === 'week' && (task.date < weekStartStr || task.date > weekEndStr)) return false;
        if (period === 'month' && !task.date.startsWith(selectedYearMonthStr)) return false;
      }

      return true;
    });
  }, [
    enrichedTasks, 
    statusFilter, 
    selectedTypeFilter, 
    selectedStageFilter, 
    selectedTagFilter, 
    searchTerm,
    displayMode,
    listDateScope,
    period,
    selectedDateStr,
    weekStartStr,
    weekEndStr,
    selectedYearMonthStr
  ]);

  // Open deal value editing
  const handleTriggerEditDealValue = (contact: Contact) => {
    if (onEditDealValue) {
      onEditDealValue(contact);
    } else {
      setInternalEditDealContact(contact);
    }
  };

  // Date Navigation Helpers
  const handlePrevPeriod = () => {
    const next = new Date(selectedDate);
    if (period === 'day') next.setDate(next.getDate() - 1);
    else if (period === 'week') next.setDate(next.getDate() - 7);
    else if (period === 'month') next.setMonth(next.getMonth() - 1);
    setSelectedDate(next);
  };

  const handleNextPeriod = () => {
    const next = new Date(selectedDate);
    if (period === 'day') next.setDate(next.getDate() + 1);
    else if (period === 'week') next.setDate(next.getDate() + 7);
    else if (period === 'month') next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const handleGoToToday = () => {
    setSelectedDate(new Date());
  };

  // Switch to specific day cleanly
  const handleGoToDay = (date: Date) => {
    setSelectedDate(date);
    setPeriod('day');
    setDisplayMode('calendar');
    setIsEventsSubtab(false);
  };

  // Switch to specific week cleanly
  const handleGoToWeek = (date?: Date) => {
    if (date) setSelectedDate(date);
    setPeriod('week');
    setDisplayMode('calendar');
    setIsEventsSubtab(false);
  };

  // Switch to month cleanly
  const handleGoToMonth = (date?: Date) => {
    if (date) setSelectedDate(date);
    setPeriod('month');
    setDisplayMode('calendar');
    setIsEventsSubtab(false);
  };

  // Open Schedule Modal with preselected date
  const handleOpenScheduleForDate = (dateStr: string) => {
    setScheduleDate(dateStr);
    setIsScheduleModalOpen(true);
  };

  // Open "Agendar Retorno & Follow-Up" modal
  const handleOpenFollowUpModal = (task?: Task | null, contact?: Contact | null) => {
    const resolvedContact = contact || (task?.contactId ? contactMap.get(task.contactId) : null);
    setFollowUpModalContact(resolvedContact || null);
    setFollowUpModalTask(task || null);
  };

  // Remove Follow-Up from modal
  const handleRemoveFollowUpModal = (taskId?: string, contactId?: string) => {
    if (taskId) {
      if (onDeleteTask) {
        onDeleteTask(taskId);
      } else {
        storageService.deleteTask(taskId);
      }
    } else if (contactId) {
      const tasks = storageService.getTasks({ contactId });
      const pendingTask = tasks.find(t => !t.completed);
      if (pendingTask) {
        storageService.deleteTask(pendingTask.id);
      } else {
        const c = storageService.getContactById(contactId);
        if (c) {
          storageService.saveContact({
            ...c,
            nextFollowUpDate: undefined,
            followUpLabel: undefined,
            nextActionType: undefined,
            nextActionTitle: undefined,
            nextActionDate: undefined,
            nextActionTime: undefined,
            nextActionNotes: undefined,
          });
        }
      }
    }
    setFollowUpModalTask(null);
    setFollowUpModalContact(null);
  };

  // Save Follow-Up & Reschedule from modal
  const handleSaveFollowUpModal = (data: {
    contactId: string;
    followUpLabel: string;
    date: string;
    time: string;
    isoDateTime: string;
    notes?: string;
    taskId?: string;
  }) => {
    if (data.followUpLabel === 'Sem Ação Definida') {
      handleRemoveFollowUpModal(data.taskId, data.contactId);
      return;
    }

    // 1. If taskId provided, update that task
    if (data.taskId) {
      onRescheduleTask(data.taskId, data.date, data.time);
      onSaveTask({
        id: data.taskId,
        reason: data.followUpLabel,
        notes: data.notes,
        time: data.time,
        date: data.date,
        dueDateTime: data.isoDateTime,
        title: `${data.followUpLabel} - ${followUpModalContact?.name || 'Lead'}`,
      });
      if (selectedTaskDetail && selectedTaskDetail.id === data.taskId) {
        setSelectedTaskDetail((prev) => prev ? {
          ...prev,
          date: data.date,
          time: data.time,
          dueDateTime: data.isoDateTime,
          reason: data.followUpLabel,
          notes: data.notes,
        } : null);
      }
    } else {
      // 2. Create new follow-up task
      onSaveTask({
        contactId: data.contactId,
        contactName: followUpModalContact?.name,
        contactPhone: followUpModalContact?.phone,
        company: followUpModalContact?.company,
        dealValue: followUpModalContact?.dealValue,
        title: `${data.followUpLabel} - ${followUpModalContact?.name || 'Lead'}`,
        reason: data.followUpLabel,
        type: 'follow_up',
        date: data.date,
        time: data.time,
        notes: data.notes,
        priority: 'high',
      });
    }

    // 3. Update contact's followUpLabel and nextFollowUpDate
    if (data.contactId && onUpdateFollowUp) {
      onUpdateFollowUp(data.contactId, data.followUpLabel, data.isoDateTime, data.notes);
    } else if (data.contactId) {
      const c = storageService.getContactById(data.contactId);
      if (c) {
        storageService.saveContact({
          ...c,
          followUpLabel: data.followUpLabel,
          nextFollowUpDate: data.isoDateTime,
          lastInteractionDate: new Date().toISOString(),
        });
      }
    }

    setFollowUpModalTask(null);
    setFollowUpModalContact(null);
  };

  // Submit Schedule Modal
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleContactId) return;

    const contact = contactMap.get(scheduleContactId);
    const finalReason = scheduleReason === 'Outro' && scheduleCustomReason.trim()
      ? scheduleCustomReason.trim()
      : scheduleReason;

    const actionTitle = `${finalReason}${contact ? ` - ${contact.name}` : ''}`;

    onSaveTask({
      contactId: scheduleContactId,
      contactName: contact?.name,
      contactPhone: contact?.phone,
      company: contact?.company,
      dealValue: contact?.dealValue,
      title: actionTitle,
      reason: finalReason,
      type: scheduleType,
      date: scheduleDate,
      time: scheduleTime,
      notes: scheduleNotes.trim() || undefined,
    });

    setIsScheduleModalOpen(false);
    setScheduleNotes('');
    setScheduleCustomReason('');
  };

  // Agendor color styling for activities
  const getAgendorBadgeStyle = (type: TaskType, isCompleted: boolean) => {
    if (isCompleted) {
      return {
        bg: 'bg-slate-400 dark:bg-slate-700 text-white line-through opacity-80',
        dot: 'bg-slate-300'
      };
    }
    switch (type) {
      case 'call':
      case 'whatsapp':
        return {
          bg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs',
          dot: 'bg-emerald-300'
        };
      case 'meeting':
        return {
          bg: 'bg-[#881337] hover:bg-[#700f2b] text-white shadow-2xs',
          dot: 'bg-rose-300'
        };
      case 'return':
      case 'follow_up':
        return {
          bg: 'bg-[#c2410c] hover:bg-[#9a3412] text-white shadow-2xs',
          dot: 'bg-amber-300'
        };
      case 'proposal':
        return {
          bg: 'bg-[#1e40af] hover:bg-[#1e3a8a] text-white shadow-2xs',
          dot: 'bg-blue-300'
        };
      default:
        return {
          bg: 'bg-slate-700 hover:bg-slate-800 text-white shadow-2xs',
          dot: 'bg-slate-400'
        };
    }
  };

  // Agendor icon for activity
  const renderAgendorIcon = (type: TaskType) => {
    switch (type) {
      case 'call': return <PhoneCall className="w-3 h-3 shrink-0" />;
      case 'whatsapp': return <MessageSquare className="w-3 h-3 shrink-0" />;
      case 'meeting': return <MapPin className="w-3 h-3 shrink-0" />;
      case 'return': return <RotateCcw className="w-3 h-3 shrink-0" />;
      case 'follow_up': return <Clock className="w-3 h-3 shrink-0" />;
      case 'proposal': return <FileText className="w-3 h-3 shrink-0" />;
      default: return <Users className="w-3 h-3 shrink-0" />;
    }
  };

  // Period header title formatted in Portuguese
  const headerTitle = useMemo(() => {
    if (period === 'month') {
      return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (period === 'week') {
      const startFmt = weekStartDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const endFmt = weekEndDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `Semana de ${startFmt} a ${endFmt}`;
    }
    // Day
    return selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }, [period, selectedDate, weekStartDate, weekEndDate]);

  return (
    <div className="space-y-2.5 pb-24 font-sans animate-fadeIn w-full max-w-full overflow-x-clip">
      {/* =========================================================================
          AGENDOR-INSPIRED TOP HEADER & TOOLBAR (STICKY / FIXA NA ZONA DE CIMA)
      ========================================================================= */}
      <div className="sticky top-[50px] sm:top-[60px] z-30 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-1.5 sm:p-3 space-y-1 sm:space-y-2 transition-colors">
        {/* Top Control Bar: Row 1 */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 flex-wrap">
          {/* Period Selectors + Today + Nav Arrows */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                onClick={() => handleGoToMonth()}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9.5px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  period === 'month' && !isEventsSubtab
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Mês Completo"
              >
                Mês
              </button>
              <button
                type="button"
                onClick={() => handleGoToWeek()}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9.5px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  period === 'week' && !isEventsSubtab
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Semana"
              >
                Sem
              </button>
              <button
                type="button"
                onClick={() => handleGoToDay(selectedDate)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9.5px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  period === 'day' && !isEventsSubtab
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Dia"
              >
                Dia
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoToToday}
              className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9.5px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
            >
              Hoje
            </button>

            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={handlePrevPeriod}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Anterior"
              >
                <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextPeriod}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Próximo"
              >
                <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>

          {/* Heading title inline */}
          {!isEventsSubtab && (
            <div className="text-center sm:text-left flex-1 min-w-0 px-1">
              <h2 className="text-xs sm:text-base font-black text-indigo-700 dark:text-indigo-400 capitalize tracking-tight truncate">
                {headerTitle}
              </h2>
            </div>
          )}

          {/* Agendar button & desktop switches */}
          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
            {/* View Switchers on Desktop */}
            <div className="hidden sm:inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => { setDisplayMode('list'); setIsEventsSubtab(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  displayMode === 'list' && !isEventsSubtab
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                <ListTodo className="w-3 h-3" />
                <span>Lista</span>
              </button>
              <button
                type="button"
                onClick={() => { setDisplayMode('calendar'); setIsEventsSubtab(false); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  displayMode === 'calendar' && !isEventsSubtab
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3 h-3" />
                <span>Cal</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsEventsSubtab(!isEventsSubtab)}
              className={`hidden sm:flex px-2.5 py-1 rounded-xl text-xs font-black items-center gap-1 border transition-all cursor-pointer ${
                isEventsSubtab
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Eventos ({savedEvents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScheduleDate(selectedDateStr || todayStr);
                setIsScheduleModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] sm:text-xs font-black shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              title="Agendar lead"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>Agendar</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Filter (Pendentes / Finalizadas) + Mobile Toggle Controls + Sync Status */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap">
          {/* Status Filter */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setStatusFilter('pendentes')}
              className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'pendentes'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              <span>Pendentes</span>
              <span className={`px-1 py-0 rounded-full text-[8px] sm:text-[9.5px] font-black ${
                statusFilter === 'pendentes' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('finalizadas')}
              className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'finalizadas'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              <span>Finalizadas</span>
              <span className={`px-1 py-0 rounded-full text-[8px] sm:text-[9.5px] font-black ${
                statusFilter === 'finalizadas' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {completedCount}
              </span>
            </button>
          </div>

          {/* Mobile view switches: Cal / Lista + Eventos */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              type="button"
              onClick={() => { setDisplayMode(displayMode === 'list' ? 'calendar' : 'list'); setIsEventsSubtab(false); }}
              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-0.5 border border-slate-200 dark:border-slate-700"
            >
              {displayMode === 'list' ? <CalendarDays className="w-2.5 h-2.5 text-indigo-600" /> : <ListTodo className="w-2.5 h-2.5 text-indigo-600" />}
              <span>{displayMode === 'list' ? 'Cal' : 'Lista'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEventsSubtab(!isEventsSubtab)}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-0.5 border ${
                isEventsSubtab ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>Eventos</span>
            </button>
          </div>

          {/* Sync & ICS mini ribbon */}
          <div className="flex items-center gap-1.5 text-[9px] sm:text-xs text-slate-500">
            <button
              type="button"
              onClick={handleSyncAllAgenda}
              disabled={isSyncingAgenda}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isSyncingAgenda ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingAgenda ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportIcs}
              className="font-bold text-slate-500 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Download className="w-2.5 h-2.5" />
              <span>.ics</span>
            </button>
            {syncFeedbackMessage && (
              <span className="text-emerald-600 font-bold flex items-center gap-0.5 text-[9px]">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {syncFeedbackMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW: EVENTOS COMERCIAIS (QUANDO ATIVADO)
      ========================================================================= */}
      {isEventsSubtab && (
        <EventCalendarView
          savedEvents={savedEvents}
          onSelectEvent={(evt) => setSelectedSavedEventForDetail(evt)}
          onOpenSearchModal={() => setIsEventSearchModalOpen(true)}
          onOpenAddToPersonalAgenda={(evt) => setEventForAddToPersonalAgenda(evt)}
        />
      )}

      {/* =========================================================================
          VIEW: CALENDÁRIO (GRID COM MÊS, SEMANA OU DIA ESTILO AGENDOR)
      ========================================================================= */}
      {!isEventsSubtab && displayMode === 'calendar' && (
        <div className="space-y-3">
          {/* =====================================================================
              1. MONTH CALENDAR GRID
          ===================================================================== */}
          {period === 'month' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-1 sm:p-3 w-full max-w-full overflow-hidden">
              <div className="w-full min-w-0">
                {/* Day names header: D, S, T, Q, Q, S, S on mobile / Dom, Seg, Ter... on desktop */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 pb-1 sm:pb-2 text-center">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, idx) => (
                    <span key={dayName} className="text-[9px] sm:text-xs font-black text-slate-500 dark:text-slate-400">
                      <span className="sm:hidden">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][idx]}</span>
                      <span className="hidden sm:inline">{dayName}</span>
                    </span>
                  ))}
                </div>

                {/* Month Cells Grid - 100% width on vertical mobile with proportional squares */}
                <div className="grid grid-cols-7 border-l border-t border-slate-200/80 dark:border-slate-800 w-full min-w-0">
                {(() => {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);

                  const startDayOfWeek = firstDay.getDay();
                  const totalDaysInMonth = lastDay.getDate();

                  const prevMonthLastDay = new Date(year, month, 0).getDate();
                  const cells = [];

                  // Previous month padding cells
                  for (let i = startDayOfWeek - 1; i >= 0; i--) {
                    const prevDateNum = prevMonthLastDay - i;
                    const prevDate = new Date(year, month - 1, prevDateNum);
                    cells.push(
                      <div 
                        key={`prev-${prevDateNum}`}
                        onClick={() => handleGoToDay(prevDate)}
                        className="min-h-[48px] sm:min-h-[100px] p-0.5 sm:p-1 border-r border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 text-slate-300 dark:text-slate-700 text-[8px] sm:text-xs font-bold cursor-pointer hover:bg-slate-100/50"
                        title={`Ir para ${prevDateNum}/${month}`}
                      >
                        <span className="block text-right pr-0.5 text-[8px] sm:text-[11px] opacity-60">
                          {prevDateNum}
                        </span>
                      </div>
                    );
                  }

                  // Current month days
                  for (let day = 1; day <= totalDaysInMonth; day++) {
                    const currentDayDate = new Date(year, month, day);
                    const currentDayStr = toLocalDateString(currentDayDate);
                    const isToday = currentDayStr === todayStr;

                    // Filter tasks for this day
                    const dayTasks = filteredTasks.filter((t) => t.date === currentDayStr);
                    const dayEvents = savedEvents.filter((e) => e.date === currentDayStr);
                    const totalDayItems = dayTasks.length + dayEvents.length;

                    // Ajuste proporcional: quando enche com mais de 3 itens,
                    // expande a altura do quadrado proporcionalmente e ajusta a escala dos itens para caberem todos no mesmo quadrado
                    const isDense = totalDayItems > 3;
                    const mobileMinH = isDense ? Math.max(50, 18 + totalDayItems * 13) : 50;

                    cells.push(
                      <div
                        key={`day-${day}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          handleGoToDay(currentDayDate);
                        }}
                        style={{ minHeight: `${mobileMinH}px` }}
                        className={`p-0.5 sm:p-1.5 border-r border-b border-slate-200/80 dark:border-slate-800 transition-all flex flex-col justify-between group/cell relative cursor-pointer min-w-0 overflow-hidden sm:min-h-[100px] ${
                          isToday 
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-inset ring-indigo-400/50' 
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-800/40'
                        }`}
                        title={`Clique para abrir o dia ${day}/${month + 1} (${totalDayItems} atividades)`}
                      >
                        {/* Day Cell Header: Plus button on hover (desktop) + counter if > 3 + Day number */}
                        <div className="flex items-center justify-between leading-none">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenScheduleForDate(currentDayStr);
                            }}
                            className="hidden sm:flex w-3.5 h-3.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover/cell:opacity-100 transition-opacity items-center justify-center text-[10px] font-black cursor-pointer"
                            title={`Agendar lead para ${day}/${month + 1}`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>

                          <div className="flex items-center gap-0.5 ml-auto">
                            {isDense && (
                              <span className="px-1 py-0 rounded-full text-[6.5px] sm:text-[8.5px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                {totalDayItems}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoToDay(currentDayDate);
                              }}
                              className={`text-[9.5px] sm:text-xs font-black pr-0.5 hover:scale-110 transition-transform cursor-pointer ${
                                isToday 
                                  ? 'text-indigo-600 dark:text-indigo-400 underline decoration-2 font-black' 
                                  : 'text-slate-800 dark:text-slate-200 hover:text-indigo-600'
                              }`}
                              title={`Ver compromissos do dia ${day}`}
                            >
                              {day}
                            </button>
                          </div>
                        </div>

                        {/* Activities list inside cell - Todos cabem no mesmo quadrado, aumente o quadrado proporcionalmente */}
                        <div className="my-0.5 flex-1 space-y-0.5">
                          {/* Tasks: micro-badge no mobile (cabe perfeitamente em ~48px) e badge completo no desktop */}
                          {dayTasks.map((task) => {
                            const badgeStyle = getAgendorBadgeStyle(task.type, task.completed);
                            const leadName = task.contact?.name || task.contactName || 'Lead';
                            const company = task.contact?.company || task.company || '';
                            const reason = task.reason || task.title;

                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskDetail(task);
                                }}
                                className={`w-full text-left rounded font-bold cursor-pointer transition-all active:scale-98 shadow-2xs ${badgeStyle.bg}`}
                                title={`${task.time || '10:00'} - ${leadName}${company ? ` (${company})` : ''} > ${reason}`}
                              >
                                {/* Mobile view: micro-pill super limpo e legível (cabe 100% no quadrado de 48px) */}
                                <div className="sm:hidden flex items-center gap-0.5 px-0.5 py-0.5 w-full overflow-hidden leading-tight text-[7px]">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.completed ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                  <span className="font-black shrink-0">{task.time ? task.time.slice(0, 5) : '10h'}</span>
                                  <span className="truncate font-semibold opacity-95">{leadName}</span>
                                </div>

                                {/* Desktop view: card completo com ícone e empresa */}
                                <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[9px] sm:text-[9.5px]">
                                  <span className="shrink-0">{renderAgendorIcon(task.type)}</span>
                                  <span className="font-extrabold shrink-0">{task.time || '10h'}</span>
                                  <span className="truncate">
                                    {company ? `${company} > ` : `${leadName} > `}
                                    {reason}
                                  </span>
                                </div>
                              </button>
                            );
                          })}

                          {/* Commercial Events: micro-pill no mobile e card no desktop */}
                          {dayEvents.map((evt) => (
                            <button
                              key={evt.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSavedEventForDetail(evt);
                              }}
                              className="w-full text-left rounded font-bold bg-purple-700 hover:bg-purple-800 text-white cursor-pointer shadow-2xs"
                              title={`Evento Comercial: ${evt.title}`}
                            >
                              <div className="sm:hidden flex items-center gap-0.5 px-0.5 py-0.5 w-full overflow-hidden leading-tight text-[7px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 shrink-0" />
                                <span className="font-black shrink-0">{evt.time ? evt.time.slice(0, 5) : '09h'}</span>
                                <span className="truncate font-semibold">{evt.title}</span>
                              </div>
                              <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[9px] sm:text-[9.5px]">
                                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                <span className="font-extrabold shrink-0">{evt.time || '09h'}</span>
                                <span className="truncate">{evt.title}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Next month padding cells
                  const totalFilled = startDayOfWeek + totalDaysInMonth;
                  const remaining = (totalFilled % 7 === 0) ? 0 : 7 - (totalFilled % 7);
                  for (let j = 1; j <= remaining; j++) {
                    const nextDate = new Date(year, month + 1, j);
                    cells.push(
                      <div 
                        key={`next-${j}`}
                        onClick={() => handleGoToDay(nextDate)}
                        className="min-h-[48px] sm:min-h-[100px] p-0.5 sm:p-1 border-r border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 text-slate-300 dark:text-slate-700 text-[8px] sm:text-xs font-bold cursor-pointer hover:bg-slate-100/50"
                        title={`Ir para ${j}/${month + 2}`}
                      >
                        <span className="block text-right pr-0.5 text-[8px] sm:text-[11px] opacity-60">
                          {j}
                        </span>
                      </div>
                    );
                  }

                  return cells;
                })()}
              </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              2. WEEK CALENDAR GRID
          ===================================================================== */}
          {period === 'week' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-5 space-y-4">
              {/* Quick week navigation bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Semana Selecionada
                  </span>
                  <span className="text-xs text-slate-400 font-bold">•</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Clique em qualquer dia para abrir a visão diária
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleGoToMonth()}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    <span>Ver Mês Inteiro</span>
                  </button>
                </div>
              </div>

              {/* 7 Columns for the week */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
                {(() => {
                  const weekDays = [];
                  for (let i = 0; i < 7; i++) {
                    const d = new Date(weekStartDate);
                    d.setDate(d.getDate() + i);
                    const dStr = toLocalDateString(d);
                    const isToday = dStr === todayStr;
                    const isSelected = dStr === selectedDateStr;
                    const dayTasks = filteredTasks.filter((t) => t.date === dStr);

                    const weekDense = dayTasks.length > 3;

                    weekDays.push(
                      <div
                        key={dStr}
                        className={`p-2 sm:p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-600 ring-2 ring-indigo-400/50 shadow-sm'
                            : isToday 
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        } sm:min-h-[220px]`}
                      >
                        {/* Day Column Header with Click to Day view */}
                        <div 
                          onClick={() => handleGoToDay(d)}
                          className="flex items-center justify-between pb-1 sm:pb-1.5 border-b border-slate-100 dark:border-slate-800 cursor-pointer group/header"
                          title={`Clique para focar no dia ${d.toLocaleDateString('pt-BR')}`}
                        >
                          <div className="flex items-center gap-1.5 sm:block">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 block">
                              {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </span>
                            <span className={`text-xs sm:text-base font-black ${isToday ? 'text-indigo-600' : 'text-slate-900 dark:text-white'} group-hover/header:text-indigo-600`}>
                              {d.getDate()}/{d.getMonth() + 1}
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover/header:bg-indigo-600 group-hover/header:text-white transition-colors">
                            {dayTasks.length}
                          </span>
                        </div>

                        {/* Tasks in this day */}
                        <div className={`my-1 sm:my-1.5 flex-1 ${weekDense ? 'space-y-1' : 'space-y-1.5'}`}>
                          {dayTasks.length === 0 ? (
                            <div 
                              onClick={() => handleGoToDay(d)}
                              className="text-center py-1 sm:py-4 cursor-pointer"
                            >
                              <span className="text-[10px] text-slate-400 block font-medium">Sem atividades</span>
                            </div>
                          ) : (
                            dayTasks.map((t) => {
                              const badgeStyle = getAgendorBadgeStyle(t.type, t.completed);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTaskDetail(t);
                                  }}
                                  className={`w-full text-left rounded-xl font-bold flex flex-col gap-0.5 cursor-pointer shadow-2xs active:scale-98 transition-all p-1.5 text-[10px] sm:text-xs ${badgeStyle.bg}`}
                                >
                                  <div className="flex items-center gap-1 text-[9px] sm:text-[11px]">
                                    {renderAgendorIcon(t.type)}
                                    <span className="font-extrabold">{t.time || '10:00'}</span>
                                  </div>
                                  <span className="truncate">{t.contact?.name || t.contactName || 'Lead'}</span>
                                  <span className="text-[8.5px] sm:text-[10px] opacity-90 truncate">🎯 {t.reason || t.title}</span>
                                </button>
                              );
                            })
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex sm:flex-col items-center gap-1 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleOpenScheduleForDate(dStr)}
                            className="flex-1 sm:w-full py-1 sm:py-1.5 text-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-[10px] sm:text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Agendar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGoToDay(d)}
                            className="flex-1 sm:w-full py-0.5 sm:py-1 text-center text-indigo-600 dark:text-indigo-400 hover:underline text-[9.5px] sm:text-[10px] font-bold cursor-pointer"
                          >
                            Ver Dia →
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return weekDays;
                })()}
              </div>
            </div>
          )}

          {/* =====================================================================
              3. DAY CALENDAR VIEW
          ===================================================================== */}
          {period === 'day' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
              {/* Day View Top Header & Return Buttons */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                      Agenda do Dia Exclusiva
                    </span>
                    {selectedDateStr === todayStr && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase">
                        Hoje
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white capitalize">
                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Quick Back to Month / Week */}
                  <button
                    type="button"
                    onClick={() => handleGoToMonth()}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-1 cursor-pointer"
                    title="Voltar para a visão mensal"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Ver Mês</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGoToWeek()}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-1 cursor-pointer"
                    title="Voltar para a visão semanal"
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    <span>Ver Semana</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenScheduleForDate(selectedDateStr)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>+ Novo Compromisso</span>
                  </button>
                </div>
              </div>

              {/* Day Tasks List */}
              {(() => {
                const dayTasks = filteredTasks.filter((t) => t.date === selectedDateStr);

                if (dayTasks.length === 0) {
                  return (
                    <div className="text-center py-16 space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                      <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-extrabold text-base text-slate-800 dark:text-slate-200">
                        Nenhum compromisso para este dia ({selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
                      </p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Aproveite para agendar um contato, follow-up, reunião ou apresentação comercial com seus leads.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleForDate(selectedDateStr)}
                        className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/30 cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agendar Lead para este Dia</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                      <span>{dayTasks.length} atividade(s) programada(s)</span>
                      <span>Ordenadas por horário</span>
                    </div>

                    {dayTasks.map((t) => {
                      const contact = t.contact;
                      const badgeStyle = getAgendorBadgeStyle(t.type, t.completed);
                      const stageConfig = contact ? STAGE_CONFIG[contact.stage] : STAGE_CONFIG.contato;

                      return (
                        <div
                          key={t.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex items-start justify-between gap-3.5 flex-wrap shadow-xs"
                        >
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => onCompleteTask(t.id)}
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                                t.completed
                                  ? 'bg-emerald-600 text-white'
                                  : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-transparent hover:text-emerald-600'
                              }`}
                              title={t.completed ? 'Tarefa finalizada (clique para reabrir)' : 'Marcar como finalizada'}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            <div className="min-w-0 flex-1 space-y-1.5">
                              {/* Type and Time */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase flex items-center gap-1 ${badgeStyle.bg}`}>
                                  {renderAgendorIcon(t.type)}
                                  <span>{t.time || '10:00'}</span>
                                  <span>•</span>
                                  <span>{TASK_TYPE_CONFIG[t.type]?.label || 'Atividade'}</span>
                                </span>

                                {contact ? (
                                  <button
                                    type="button"
                                    onClick={() => onSelectContact(contact)}
                                    className="font-black text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                                  >
                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{contact.name}</span>
                                  </button>
                                ) : (
                                  <span className="font-black text-sm text-slate-900 dark:text-white">
                                    {t.contactName || 'Lead'}
                                  </span>
                                )}

                                {(contact?.company || t.company) && (
                                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <span>{contact?.company || t.company}</span>
                                  </span>
                                )}

                                {contact?.stage && (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                                    {stageConfig.label}
                                  </span>
                                )}
                              </div>

                              {/* 🎯 Motivo do Agendamento */}
                              <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-start gap-2 text-xs">
                                <span className="font-black text-indigo-700 dark:text-indigo-300 shrink-0">
                                  🎯 Motivo:
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {t.reason || t.title}
                                </span>
                              </div>

                              {/* Informações do Lead & Valor Estimado */}
                              {contact && (
                                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-0.5">
                                  {contact.phone && (
                                    <span className="font-semibold">📞 {contact.phone}</span>
                                  )}
                                  {contact.email && (
                                    <span>✉️ {contact.email}</span>
                                  )}
                                  {contact.city && (
                                    <span>📍 {contact.city}</span>
                                  )}

                                  {/* Valor Estimado com clique que abre aba de edição */}
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerEditDealValue(contact)}
                                    className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group ml-auto"
                                    title="Clique para editar o valor estimado deste lead"
                                  >
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110" />
                                    <span>
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue || 0)}
                                    </span>
                                    <Edit3 className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                  </button>
                                </div>
                              )}

                              {t.notes && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                                  "{t.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick action buttons on day card */}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 w-full justify-end flex-wrap">
                            {contact && (
                              <>
                                <a
                                  href={getWhatsAppUrl(contact.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 flex items-center gap-1 text-xs font-bold"
                                  title="Abrir WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-200 flex items-center gap-1 text-xs font-bold"
                                  title="Ligar"
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                  <span>Ligar</span>
                                </a>
                              </>
                            )}

                            {/* Botão Agendar Retorno & Follow-Up */}
                            <button
                              type="button"
                              onClick={() => handleOpenFollowUpModal(t, contact)}
                              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-black flex items-center gap-1.5 border border-rose-200 dark:border-rose-800 cursor-pointer transition-all active:scale-95"
                              title="Agendar Retorno & Follow-Up com este lead"
                            >
                              <CalendarIcon className="w-3.5 h-3.5 text-rose-500" />
                              <span>Agendar Retorno & Follow-Up</span>
                            </button>

                            {/* Avançar / Retroceder Etapa */}
                            {contact && (
                              <button
                                type="button"
                                onClick={() => {
                                  const stages: FunnelStage[] = ['contato', 'prospeccao', 'proposta', 'perdido'];
                                  const curIdx = stages.indexOf(contact.stage);
                                  const nextStage = curIdx < stages.length - 1 ? stages[curIdx + 1] : stages[0];
                                  onOpenStageMovement(contact, nextStage);
                                }}
                                className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer transition-colors"
                              >
                                Mover Etapa
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedTaskDetail(t)}
                              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                            >
                              Ver Detalhes
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW: LISTAGEM DE ATIVIDADES (QUANDO displayMode === 'list')
      ========================================================================= */}
      {!isEventsSubtab && displayMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">
          {/* List header controls */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                {listDateScope === 'period' ? (
                  <>Mostrando atividades de: <strong className="text-indigo-600">{headerTitle}</strong></>
                ) : (
                  <>Mostrando <strong className="text-indigo-600">Todas as Atividades</strong></>
                )}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                {filteredTasks.length} itens
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setListDateScope(listDateScope === 'period' ? 'all' : 'period')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                {listDateScope === 'period' ? 'Ver Todas as Datas' : 'Filtrar pelo Período Atual'}
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por lead, empresa, motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
              className="p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
            >
              <option value="all">Todos os tipos de atividade</option>
              {Object.entries(TASK_TYPE_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>{cfg.label}</option>
              ))}
            </select>

            <select
              value={selectedStageFilter}
              onChange={(e) => setSelectedStageFilter(e.target.value as any)}
              className="p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
            >
              <option value="all">Todas as etapas do funil</option>
              {Object.entries(STAGE_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-bold">Nenhuma atividade encontrada neste filtro.</p>
                <p>Altere o status, limpe a busca ou clique em "+ Agendar Lead".</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const contact = task.contact;
                const badgeStyle = getAgendorBadgeStyle(task.type, task.completed);
                const stage = contact ? contact.stage : 'contato';
                const stageConfig = STAGE_CONFIG[stage];

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      task.completed
                        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                        : task.isOverdue
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                        : task.isToday
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      {/* Checkbox & Header */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onCompleteTask(task.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                            task.completed
                              ? 'bg-emerald-600 text-white'
                              : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-transparent hover:text-emerald-600'
                          }`}
                          title={task.completed ? 'Tarefa finalizada' : 'Marcar como finalizada'}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 ${badgeStyle.bg}`}>
                              {renderAgendorIcon(task.type)}
                              <span>{TASK_TYPE_CONFIG[task.type]?.label || 'Atividade'}</span>
                            </span>

                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {task.title}
                            </span>

                            {task.isOverdue && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black uppercase">
                                Atrasada
                              </span>
                            )}
                            {task.isToday && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-black uppercase">
                                Hoje
                              </span>
                            )}
                          </div>

                          {/* Motivo do Agendamento */}
                          <div className="mt-1 flex items-center gap-1.5 text-xs">
                            <span className="font-black text-indigo-600 dark:text-indigo-400">
                              🎯 Motivo:
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {task.reason || task.title}
                            </span>
                          </div>

                          {/* Informações do Lead */}
                          {contact ? (
                            <div className="mt-1.5 p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 flex items-center gap-2 flex-wrap text-xs">
                              <button
                                type="button"
                                onClick={() => onSelectContact(contact)}
                                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <User className="w-3 h-3" />
                                <span>{contact.name}</span>
                              </button>

                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600 dark:text-slate-300">{contact.company || 'Pessoa Física'}</span>

                              <span className="text-slate-400">•</span>
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                                {stageConfig.label}
                              </span>

                              <span className="text-slate-400">•</span>
                              {/* Valor Estimado com clique que abre a aba para editar */}
                              <button
                                type="button"
                                onClick={() => handleTriggerEditDealValue(contact)}
                                className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-1 cursor-pointer shadow-2xs group"
                                title="Clique para editar o valor estimado deste lead"
                              >
                                <DollarSign className="w-3 h-3 text-emerald-500 group-hover:scale-110" />
                                <span>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue || 0)}
                                </span>
                                <Edit3 className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                              </button>

                              {contact.phone && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-500">📞 {contact.phone}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 mt-1 block">Lead não vinculado</span>
                          )}
                        </div>
                      </div>

                      {/* Date & Time Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black block text-slate-800 dark:text-slate-200">
                          {task.date.split('-').reverse().slice(0, 2).join('/')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-bold block">
                          {task.time || '10:00'}
                        </span>
                      </div>
                    </div>

                    {/* Quick actions row */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        {contact && (
                          <>
                            <a
                              href={getWhatsAppUrl(contact.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200"
                              title="Abrir WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`tel:${contact.phone}`}
                              className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-200"
                              title="Ligar"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                        <a
                          href={getGoogleCalendarUrl({
                            title: task.title,
                            date: task.date,
                            time: task.time,
                            description: `Motivo: ${task.reason || task.title}\nLead: ${contact?.name || ''}`,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[10px] font-bold flex items-center gap-1"
                        >
                          <CalendarCheck className="w-3 h-3" />
                          <span>Google Agenda</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Botão Agendar Retorno & Follow-Up */}
                        <button
                          type="button"
                          onClick={() => handleOpenFollowUpModal(task, contact)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Agendar Retorno & Follow-Up"
                        >
                          <CalendarIcon className="w-3 h-3 text-rose-500" />
                          <span>Retorno & Follow-Up</span>
                        </button>

                        {contact && (
                          <button
                            type="button"
                            onClick={() => {
                              const stages: FunnelStage[] = ['contato', 'prospeccao', 'proposta', 'perdido'];
                              const curIdx = stages.indexOf(contact.stage);
                              const nextStage = curIdx < stages.length - 1 ? stages[curIdx + 1] : stages[0];
                              onOpenStageMovement(contact, nextStage);
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Mover etapa do lead no funil"
                          >
                            Mover Etapa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja remover este compromisso da agenda?')) {
                              if (onDeleteTask) {
                                onDeleteTask(task.id);
                              } else {
                                storageService.deleteTask(task.id);
                              }
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Remover compromisso da agenda"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remover</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTaskDetail(task)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: AGENDAR LEAD NA AGENDA (COM MOTIVO E INFORMAÇÕES COMPLETAS)
      ========================================================================= */}
      {isScheduleModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-slate-50 to-emerald-500/10 dark:from-indigo-950/30 dark:via-slate-900 dark:to-emerald-950/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md">
                  <CalendarDays className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    Agendar Lead na Agenda
                  </h3>
                  <p className="text-[11px] text-slate-500">Defina o motivo e as informações para o compromisso</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 no-scrollbar">
              {/* Select Lead */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Selecione o Lead / Cliente *
                </label>
                <select
                  value={scheduleContactId}
                  onChange={(e) => setScheduleContactId(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">-- Escolha um lead cadastrado --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''} • {STAGE_CONFIG[c.stage].label} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(c.dealValue || 0)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lead Live Card (shows once selected) */}
              {scheduleContactId && (() => {
                const sel = contactMap.get(scheduleContactId);
                if (!sel) return null;
                const stageConfig = STAGE_CONFIG[sel.stage];
                return (
                  <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5 animate-fadeIn text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 dark:text-white flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        {sel.name}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                        {stageConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
                      <span>🏢 {sel.company || 'Pessoa Física'}</span>
                      {sel.phone && <span>📞 {sel.phone}</span>}
                      {sel.city && <span>📍 {sel.city}</span>}

                      {/* Valor com clique para editar */}
                      <button
                        type="button"
                        onClick={() => handleTriggerEditDealValue(sel)}
                        className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer ml-auto"
                        title="Clique para editar o valor estimado"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(sel.dealValue || 0)}</span>
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Motivo do Contato (Reason) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  🎯 Motivo do Contato / Agendamento *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setScheduleReason(r)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        scheduleReason === r
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-102'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setScheduleReason('Outro')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      scheduleReason === 'Outro'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Outro / Personalizado
                  </button>
                </div>

                {scheduleReason === 'Outro' && (
                  <input
                    type="text"
                    placeholder="Digite o motivo específico..."
                    value={scheduleCustomReason}
                    onChange={(e) => setScheduleCustomReason(e.target.value)}
                    className="w-full mt-1.5 p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                    required
                  />
                )}
              </div>

              {/* Canal / Tipo, Data, Horário */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                    Tipo / Canal
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value as TaskType)}
                    className="w-full p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    {Object.entries(TASK_TYPE_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>
              </div>

              {/* Observações / Anotações */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Observações / Detalhes para este Contato
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Apresentar simulação de taxa reduzida, confirmar se o sócio estará presente..."
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Form Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETALHES COMPLETOS DO COMPROMISSO DO LEAD CLICADO NO CALENDÁRIO
      ========================================================================= */}
      {selectedTaskDetail && (() => {
        const task = selectedTaskDetail;
        const contact = task.contactId ? contactMap.get(task.contactId) : undefined;
        const stageConfig = contact ? STAGE_CONFIG[contact.stage] : STAGE_CONFIG.contato;
        const badgeStyle = getAgendorBadgeStyle(task.type, task.completed);

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
            onClick={() => setSelectedTaskDetail(null)}
          >
            <div 
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp max-h-[92vh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/30">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white ${badgeStyle.bg}`}>
                    {renderAgendorIcon(task.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                      Compromisso do Lead na Agenda
                    </span>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                      {task.time || '10:00'} • {task.date.split('-').reverse().join('/')}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTaskDetail(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4 text-xs">
                {/* 🎯 Motivo do Contato */}
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-0.5">
                    🎯 Motivo do Contato / Ação:
                  </span>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {task.reason || task.title}
                  </p>
                </div>

                {/* 👤 Informações do Lead */}
                {contact && (
                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      👤 Informações do Lead
                    </span>

                    <div className="flex items-center justify-between">
                      <h4 
                        onClick={() => {
                          setSelectedTaskDetail(null);
                          onSelectContact(contact);
                        }}
                        className="font-black text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {contact.name}
                      </h4>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                        {stageConfig.label}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <p className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{contact.company || 'Pessoa Física'} {contact.role ? `• ${contact.role}` : ''}</span>
                      </p>
                      {contact.phone && (
                        <p className="flex items-center gap-1.5">
                          <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.phone}</span>
                        </p>
                      )}
                      {contact.city && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.city}</span>
                        </p>
                      )}
                    </div>

                    {/* 💰 Valor Estimado com clique que abre aba de edição */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="font-bold text-slate-500">Valor Estimado:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTaskDetail(null);
                          handleTriggerEditDealValue(contact);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs group"
                        title="Clique para editar o valor estimado deste lead"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110" />
                        <span>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue || 0)}
                        </span>
                        <Edit3 className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                      </button>
                    </div>

                    {/* 📊 Movimentação no Funil: Avançar e Retroceder pela Agenda */}
                    <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-black">
                          <span>📊 Etapa no Funil:</span>
                          <span className={`px-1.5 py-0.2 rounded border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                            {stageConfig.label}
                          </span>
                        </span>
                        <span className="text-[9px] text-slate-400">Avançar / Retroceder</span>
                      </div>

                      {(() => {
                        const stages: FunnelStage[] = ['contato', 'prospeccao', 'proposta', 'perdido'];
                        const curIdx = stages.indexOf(contact.stage);
                        const prevStage = curIdx > 0 ? stages[curIdx - 1] : null;
                        const nextStage = curIdx < stages.length - 1 ? stages[curIdx + 1] : null;

                        return (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-2 gap-1.5">
                              {prevStage ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTaskDetail(null);
                                    onOpenStageMovement(contact, prevStage);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                                  title={`Retroceder para ${STAGE_CONFIG[prevStage].label}`}
                                >
                                  <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Voltar: {STAGE_CONFIG[prevStage].label}</span>
                                </button>
                              ) : (
                                <div className="px-2 py-1.5 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 text-[10px] font-bold text-center border border-dashed border-slate-200 dark:border-slate-800">
                                  Início (Frio)
                                </div>
                              )}

                              {nextStage ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTaskDetail(null);
                                    onOpenStageMovement(contact, nextStage);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-all active:scale-95"
                                  title={`Avançar para ${STAGE_CONFIG[nextStage].label}`}
                                >
                                  <span className="truncate">Avançar: {STAGE_CONFIG[nextStage].label}</span>
                                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              ) : (
                                <div className="px-2 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black text-center border border-emerald-200 dark:border-emerald-800">
                                  ✓ Convertido (Cliente)
                                </div>
                              )}
                            </div>

                            {/* Atalhos para saltar diretamente para qualquer etapa */}
                            <div className="flex items-center gap-1 pt-0.5">
                              <span className="text-[9px] font-bold text-slate-400 shrink-0">Mudar para:</span>
                              <div className="grid grid-cols-4 gap-1 flex-1">
                                {stages.map((stg) => {
                                  const isCurrent = contact.stage === stg;
                                  const cfg = STAGE_CONFIG[stg];
                                  return (
                                    <button
                                      key={stg}
                                      type="button"
                                      disabled={isCurrent}
                                      onClick={() => {
                                        setSelectedTaskDetail(null);
                                        onOpenStageMovement(contact, stg);
                                      }}
                                      className={`py-0.5 px-1 rounded-lg text-[9px] font-extrabold border transition-all text-center cursor-pointer ${
                                        isCurrent
                                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 border-transparent cursor-default opacity-50'
                                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 active:scale-95'
                                      }`}
                                    >
                                      {cfg.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Observações da tarefa */}
                {task.notes && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                      📝 Observações da Tarefa:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {task.notes}
                    </p>
                  </div>
                )}

                {/* BOTÃO PRINCIPAL: AGENDAR RETORNO & FOLLOW-UP (SUBSTITUI OS BOTÕES DE VÁRIOS HORÁRIOS) */}
                <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-rose-500" />
                      <span>Agendamento de Retorno & Follow-Up</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Defina etiqueta de retorno (1º, 2º contato, entrevista, fechamento), data, horário e anotações.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenFollowUpModal(task, contact);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <CalendarIcon className="w-4 h-4 stroke-[2.5]" />
                    <span>Agendar Retorno & Follow-Up</span>
                  </button>
                </div>

                {/* Direct Action Buttons */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                  {contact && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getWhatsAppUrl(contact.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
                        title="WhatsApp direto"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                      <a
                        href={`tel:${contact.phone}`}
                        className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1"
                        title="Ligar"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Ligar</span>
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja remover este compromisso e enviar o lead para a Zona de Guerra (sem próxima ação)?')) {
                          if (onDeleteTask) {
                            onDeleteTask(task.id);
                          } else {
                            storageService.deleteTask(task.id);
                          }
                          setSelectedTaskDetail(null);
                          if (onNavigateToWarZone) {
                            onNavigateToWarZone();
                          }
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200 transition-all cursor-pointer flex items-center gap-1"
                      title="Remover compromisso e enviar para a Zona de Guerra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCompleteTask(task.id);
                        setSelectedTaskDetail(null);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      }`}
                    >
                      {task.completed ? 'Reabrir Atividade' : '✓ Concluir Atividade'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL: AGENDAR RETORNO & FOLLOW-UP (REUTILIZÁVEL E COMPLETO)
      ========================================================================= */}
      <ScheduleFollowUpModal
        isOpen={Boolean(followUpModalContact || followUpModalTask)}
        contact={followUpModalContact}
        task={followUpModalTask}
        onClose={() => {
          setFollowUpModalContact(null);
          setFollowUpModalTask(null);
        }}
        onSave={handleSaveFollowUpModal}
        onRemove={handleRemoveFollowUpModal}
      />

      {/* =========================================================================
          MODAL DE EDIÇÃO DE VALOR ESTIMADO (QUANDO ACIONADO INTERNAMENTE)
      ========================================================================= */}
      <EditDealValueModal
        contact={internalEditDealContact}
        isOpen={Boolean(internalEditDealContact)}
        onClose={() => setInternalEditDealContact(null)}
        onSave={(updated) => {
          storageService.saveContact(updated);
          setInternalEditDealContact(null);
        }}
      />

      {/* =========================================================================
          EVENTOS MODALS (BUSCA, DETALHE, CONFIRMAÇÃO)
      ========================================================================= */}
      {isEventSearchModalOpen && (
        <EventSearchModal
          initialConfig={eventSearchConfig}
          savedExternalEventIds={new Set(savedEvents.map((e) => e.externalEventId))}
          onClose={() => setIsEventSearchModalOpen(false)}
          onSaveConfig={(cfg) => {
            const updated = storageService.setEventSearchConfig(cfg);
            setEventSearchConfig(updated);
          }}
          onSelectEventToSave={(extEvt) => {
            setSelectedEventForAddToEvents(extEvt);
          }}
          onAddHistoryEntry={(entry) => {
            storageService.addEventSearchHistory(entry);
            setEventSearchHistory(storageService.getEventSearchHistory());
          }}
          searchHistory={eventSearchHistory}
        />
      )}

      {selectedEventForAddToEvents && (
        <AddToEventsModal
          event={selectedEventForAddToEvents}
          onClose={() => setSelectedEventForAddToEvents(null)}
          onConfirm={(savedData) => {
            storageService.saveEventToCalendar(savedData);
            setSavedEvents(storageService.getSavedEvents());
            setSelectedEventForAddToEvents(null);
          }}
        />
      )}

      {selectedSavedEventForDetail && (
        <EventDetailModal
          event={selectedSavedEventForDetail}
          onClose={() => setSelectedSavedEventForDetail(null)}
          onUpdateEvent={(id, updates) => {
            const updated = storageService.updateSavedEvent(id, updates);
            setSavedEvents(storageService.getSavedEvents());
            if (updated) setSelectedSavedEventForDetail(updated);
          }}
          onOpenAddToPersonalAgenda={(evt) => {
            setSelectedSavedEventForDetail(null);
            setEventForAddToPersonalAgenda(evt);
          }}
          onNavigateToPersonalAgenda={() => {
            setSelectedSavedEventForDetail(null);
            setDisplayMode('calendar');
          }}
          onRemoveEvent={(id) => {
            console.log('Removing event:', id);
            const success = storageService.removeSavedEvent(id);
            console.log('Removal success:', success);
            setSavedEvents(storageService.getSavedEvents());
            setSelectedSavedEventForDetail(null);
          }}
        />
      )}

      {eventForAddToPersonalAgenda && (
        <AddToPersonalAgendaModal
          event={eventForAddToPersonalAgenda}
          currentUser={storageService.getCurrentUser()}
          users={storageService.getUsers()}
          conflictingTasks={storageService.checkEventAgendaConflict(
            eventForAddToPersonalAgenda.date,
            eventForAddToPersonalAgenda.time
          )}
          onClose={() => setEventForAddToPersonalAgenda(null)}
          onConfirm={(data) => {
            const result = storageService.addEventToPersonalAgenda(
              eventForAddToPersonalAgenda.id,
              data.personalNotes,
              data.assignedTo,
              data.targetDate,
              data.targetTime
            );
            if (result) {
              setSavedEvents(storageService.getSavedEvents());
              onSaveTask({
                ...result.task,
                contactId: result.task.contactId || '',
                title: result.task.title,
              });
            }
            setEventForAddToPersonalAgenda(null);
          }}
        />
      )}
    </div>
  );
};
