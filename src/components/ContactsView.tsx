import React, { useState, useMemo } from 'react';
import { 
  Contact, 
  Tag, 
  FunnelStage, 
  STAGE_CONFIG,
  Interaction,
  Task,
  TaskType,
  TASK_TYPE_CONFIG
} from '../types';
import { getWhatsAppUrl } from '../utils/whatsapp';
import { toLocalDateString } from '../utils/calendarSync';
import { storageService } from '../services/storage';
import { 
  Search, 
  Plus, 
  Tag as TagIcon, 
  Filter, 
  PhoneCall, 
  MessageSquare, 
  Mail, 
  Building2, 
  MapPin, 
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  CheckCircle2,
  ArrowRightLeft,
  DollarSign,
  UserCheck,
  Briefcase,
  Sparkles,
  Calendar,
  Clock,
  AlertCircle,
  Check,
  MoreHorizontal,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  Edit3,
  AlertTriangle,
  Swords,
  Target,
  Flame,
  Snowflake,
  Send,
  HelpCircle,
  Layers,
  ArrowUpRight,
  User,
  ShieldAlert,
  Compass,
  RotateCcw,
  RefreshCw,
  Skull
} from 'lucide-react';
import { ScheduleFollowUpModal } from './ScheduleFollowUpModal';

interface ContactsViewProps {
  contacts: Contact[];
  tags: Tag[];
  interactions?: Interaction[];
  tasks: Task[];
  onSelectContact: (contact: Contact) => void;
  onEditContact?: (contact: Contact) => void;
  onOpenNewContactModal: () => void;
  onManageTags: () => void;
  onOpenCsvImport?: () => void;
  onExportCsv?: () => void;
  onClearAllContacts?: () => void;
  onUpdateStage?: (contactId: string, newStage: FunnelStage) => void;
  onOpenStageMovement?: (contact: Contact, targetStage: FunnelStage) => void;
  onOpenQuickResponse?: (contact: Contact) => void;
  onToggleContactTag?: (contactId: string, tagId: string) => void;
  onCreateTag?: (name: string, bgHex?: string, textHex?: string) => Tag;
  onUpdateFollowUp?: (contactId: string, followUpLabel: string, nextFollowUpDate: string, notes?: string) => void;
  onEditDealValue?: (contact: Contact) => void;
  onAddInteraction?: (interactionData: Omit<Interaction, 'id' | 'synced'>) => void;
  onSaveTask?: (taskData: any) => void;
}

// Opções de resultado da 1ª abordagem
const APPROACH_RESULTS = [
  { id: 'interested', label: 'Atendeu / Respondeu com Interesse', icon: '🟢', nextAction: 'Qualificar e definir temperatura (Morno ou Quente)' },
  { id: 'callback', label: 'Respondeu / Pediu para retornar mais tarde', icon: '🟡', nextAction: 'Agendar Retorno & Follow-Up na Agenda' },
  { id: 'no_reply', label: 'Sem resposta (Mensagem enviada / Aguardando)', icon: '🟣', nextAction: 'Manter Sem Temperatura e tentar amanhã' },
  { id: 'unanswered', label: 'Não atendeu / Chamou até cair', icon: '🔴', nextAction: 'Manter Sem Temperatura e tentar novamente' },
  { id: 'invalid', label: 'Número incorreto / Invalido', icon: '⚪', nextAction: 'Descartar ou solicitar novo contato' },
];

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  tags,
  interactions = [],
  tasks = [],
  onSelectContact,
  onEditContact,
  onOpenNewContactModal,
  onManageTags,
  onOpenCsvImport,
  onExportCsv,
  onClearAllContacts,
  onUpdateStage,
  onOpenStageMovement,
  onOpenQuickResponse,
  onToggleContactTag,
  onCreateTag,
  onUpdateFollowUp,
  onEditDealValue,
  onAddInteraction,
  onSaveTask,
}) => {
  // Sub-aba principal da Zona de Guerra: Fila de Ataque (padrão), Vencidas, Sem Temp. & Descartados, ou Base Geral
  const [activeZoneSubTab, setActiveZoneSubTab] = useState<'attack_queue' | 'overdue' | 'triage_discarded' | 'all_contacts'>('attack_queue');

  // Filtros internos da sub-aba Sem Temp. & Descartados
  const [discardedFilter, setDiscardedFilter] = useState<'ALL' | 'SEM_TEMP' | 'PERDIDO' | 'DESINTERESSADO' | 'RECUPERAR' | 'MORTO' | 'OUTRO'>('ALL');
  const [discardedSearchTerm, setDiscardedSearchTerm] = useState('');

  // Modal de Agendar Retorno & Follow-up de Resgate
  const [followUpContactToSchedule, setFollowUpContactToSchedule] = useState<Contact | null>(null);

  // Search e filtros para a base geral
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<FunnelStage | 'ALL'>('ALL');
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'SCHEDULED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal: Registrar 1ª Abordagem Comercial
  const [approachModalContact, setApproachModalContact] = useState<Contact | null>(null);
  const [approachChannel, setApproachChannel] = useState<TaskType>('whatsapp');
  const [approachResultId, setApproachResultId] = useState<string>('interested');
  const [approachNotes, setApproachNotes] = useState<string>('');
  const [approachTemperatureDecision, setApproachTemperatureDecision] = useState<string>('sem_temperatura');
  const [scheduleFollowUpAfterApproach, setScheduleFollowUpAfterApproach] = useState<boolean>(true);
  const [followUpDateAfterApproach, setFollowUpDateAfterApproach] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toLocalDateString(tomorrow);
  });
  const [followUpTimeAfterApproach, setFollowUpTimeAfterApproach] = useState<string>('10:00');

  // Quick Tag Dropdown State for cards
  const [activeTagMenuContactId, setActiveTagMenuContactId] = useState<string | null>(null);
  const [inlineTagName, setInlineTagName] = useState('');

  const tagMap = useMemo(() => new Map<string, Tag>(tags.map((t) => [t.id, t])), [tags]);

  // Set de IDs de contatos que já tiveram alguma abordagem registrada no histórico
  const approachedContactIds = useMemo(() => {
    const ids = new Set<string>();
    for (const inter of interactions) {
      if (
        [
          'call',
          'whatsapp',
          'email',
          'meeting',
          'response_logged',
          'first_approach',
          'proposal'
        ].includes(inter.type)
      ) {
        ids.add(inter.contactId);
      }
    }
    return ids;
  }, [interactions]);

  // FILA DE ATAQUE DA ZONA DE GUERRA:
  // Mostra leads que NÃO estão na agenda (sem tarefa pendente e sem nextFollowUpDate futuro/ativo) e não foram descartados ou perdidos.
  const attackQueueContacts = useMemo(() => {
    const pendingTaskContactIds = new Set(tasks.filter((t) => !t.completed && t.contactId).map((t) => t.contactId));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return contacts.filter((c) => {
      // 1. Se foi descartado com motivo, temperatura descartada ou etapa perdida
      if (c.discardReason) return false;
      if (c.temperature === 'descartado') return false;
      if (c.stage === 'perdido') return false;

      // 2. Se está na agenda (tem tarefa pendente ou nextFollowUpDate ativo), não está na fila de ataque
      const hasPendingTask = pendingTaskContactIds.has(c.id);
      const hasFollowUp = c.nextFollowUpDate && new Date(c.nextFollowUpDate).getTime() >= todayStart.getTime();
      if (hasPendingTask || hasFollowUp) {
        return false;
      }

      // 3. Se não está na agenda, entra/retorna para a Fila de Ataque da Zona de Guerra
      return true;
    });
  }, [contacts, tasks]);

  // Contagem de leads na Fila de Ataque
  const pendingAttackCount = attackQueueContacts.length;

  // LEADS VENCIDOS / ATRASADOS
  const overdueContacts = useMemo(() => {
    const todayStr = toLocalDateString(new Date());
    const overdueContactIds = new Set<string>();

    for (const task of tasks) {
      if (!task.completed && task.contactId && task.date < todayStr) {
        overdueContactIds.add(task.contactId);
      }
    }

    for (const c of contacts) {
      if (c.nextFollowUpDate && c.nextFollowUpDate.slice(0, 10) < todayStr) {
        overdueContactIds.add(c.id);
      }
    }

    return contacts.filter((c) => overdueContactIds.has(c.id));
  }, [contacts, tasks]);

  // LEADS SEM TEMPERATURA & DESCARTADOS:
  // Centraliza os leads que não possuem temperatura definida ou foram descartados (perdido, desinteressado, recuperar, lead morto, outros)
  const unclassifiedAndDiscardedContacts = useMemo(() => {
    return contacts.filter((c) => {
      // 1. Sem temperatura definida
      if (!c.temperature || c.temperature === 'sem_temperatura') return true;
      // 2. Marcados como descartados
      if (c.temperature === 'descartado') return true;
      // 3. Etapa perdido / descartado
      if (c.stage === 'perdido') return true;
      // 4. Motivo de descarte explícito
      if (c.discardReason) return true;
      // 5. Ou resultado da primeira abordagem indicou descarte
      if (
        c.firstApproachResult &&
        ['invalido', 'unanswered', 'descartado', 'invalid', 'incorreto', 'perdido', 'desinteressado'].some((s) =>
          c.firstApproachResult?.toLowerCase().includes(s)
        )
      ) {
        return true;
      }
      return false;
    });
  }, [contacts]);

  // Contagens por categoria dentro de Sem Temp. & Descartados:
  const discardedCounts = useMemo(() => {
    let semTemp = 0;
    let perdido = 0;
    let desinteressado = 0;
    let recuperar = 0;
    let morto = 0;
    let outro = 0;

    for (const c of unclassifiedAndDiscardedContacts) {
      const reason = c.discardReason;
      const notesLower = (c.notes || '').toLowerCase();
      const resultLower = (c.firstApproachResult || '').toLowerCase();

      if (reason === 'recuperar' || notesLower.includes('recuperar')) {
        recuperar++;
      } else if (reason === 'desinteressado' || (c.temperature === 'descartado' && !reason && !notesLower.includes('perdid'))) {
        desinteressado++;
      } else if (reason === 'perdido' || c.stage === 'perdido' || notesLower.includes('perdid')) {
        perdido++;
      } else if (reason === 'morto' || reason === 'invalido' || resultLower.includes('inval') || notesLower.includes('morto')) {
        morto++;
      } else if (reason === 'outro') {
        outro++;
      } else if (!c.temperature || c.temperature === 'sem_temperatura') {
        semTemp++;
      } else {
        outro++;
      }
    }

    return { semTemp, perdido, desinteressado, recuperar, morto, outro };
  }, [unclassifiedAndDiscardedContacts]);

  // Filtragem da lista da sub-aba Sem Temp. & Descartados:
  const filteredDiscardedContacts = useMemo(() => {
    return unclassifiedAndDiscardedContacts.filter((c) => {
      if (discardedSearchTerm.trim()) {
        const q = discardedSearchTerm.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.toLowerCase().includes(q);
        const matchesCompany = (c.company || '').toLowerCase().includes(q);
        const matchesNotes = (c.notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCompany && !matchesNotes) {
          return false;
        }
      }

      const reason = c.discardReason;
      const notesLower = (c.notes || '').toLowerCase();
      const resultLower = (c.firstApproachResult || '').toLowerCase();

      if (discardedFilter === 'SEM_TEMP') {
        return (!c.temperature || c.temperature === 'sem_temperatura') && !reason;
      }
      if (discardedFilter === 'PERDIDO') {
        return reason === 'perdido' || (c.stage === 'perdido' && reason !== 'recuperar' && reason !== 'desinteressado') || notesLower.includes('perdid');
      }
      if (discardedFilter === 'DESINTERESSADO') {
        return reason === 'desinteressado' || (c.temperature === 'descartado' && !reason) || notesLower.includes('desinteress');
      }
      if (discardedFilter === 'RECUPERAR') {
        return reason === 'recuperar' || notesLower.includes('recuperar');
      }
      if (discardedFilter === 'MORTO') {
        return reason === 'morto' || reason === 'invalido' || resultLower.includes('inval') || notesLower.includes('morto');
      }
      if (discardedFilter === 'OUTRO') {
        return reason === 'outro' || (!['recuperar', 'desinteressado', 'perdido', 'morto', 'invalido'].includes(reason || '') && c.temperature !== 'sem_temperatura' && reason);
      }

      return true;
    });
  }, [unclassifiedAndDiscardedContacts, discardedFilter, discardedSearchTerm]);

  // Filtragem para a Base Geral de Contatos
  const filteredAllContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Busca textual
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = contact.name.toLowerCase().includes(q);
        const matchesPhone = contact.phone.toLowerCase().includes(q);
        const matchesCompany = (contact.company || '').toLowerCase().includes(q);
        const matchesRole = (contact.role || '').toLowerCase().includes(q);
        const matchesCity = (contact.city || '').toLowerCase().includes(q);
        const matchesNotes = (contact.notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesCompany && !matchesRole && !matchesCity && !matchesNotes) {
          return false;
        }
      }

      // Filtro de Tag
      if (selectedTagId && !contact.tagIds.includes(selectedTagId)) {
        return false;
      }

      // Filtro de Estágio
      if (selectedStage !== 'ALL' && contact.stage !== selectedStage) {
        return false;
      }

      // Filtro de Agendamento
      if (scheduleFilter !== 'ALL') {
        const todayStr = toLocalDateString(new Date());
        if (scheduleFilter === 'TODAY') {
          if (!contact.nextFollowUpDate || !contact.nextFollowUpDate.startsWith(todayStr)) return false;
        } else if (scheduleFilter === 'OVERDUE') {
          if (!contact.nextFollowUpDate || contact.nextFollowUpDate.slice(0, 10) >= todayStr) return false;
        } else if (scheduleFilter === 'SCHEDULED') {
          if (!contact.nextFollowUpDate) return false;
        }
      }

      return true;
    });
  }, [contacts, searchTerm, selectedTagId, selectedStage, scheduleFilter]);

  // Total financeiro dos contatos filtrados
  const totalPipelineValue = useMemo(() => {
    return contacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  }, [contacts]);

  // Helper de recomendação tática inteligente por lead
  const getTacticalRecommendation = (contact: Contact) => {
    const notesLower = (contact.notes || '').toLowerCase();
    const phoneClean = (contact.phone || '').replace(/\D/g, '');

    if (contact.company && contact.company !== 'Pessoa Física') {
      return {
        title: 'Ligação Estratégica B2B',
        desc: 'Contato executivo direto com decisor para sondar volume e demandas da empresa.',
        channel: 'call' as TaskType,
        icon: PhoneCall,
        actionLabel: 'Ligar Agora',
      };
    }

    if (notesLower.includes('urgente') || notesLower.includes('orçamento') || notesLower.includes('proposta')) {
      return {
        title: 'Abordagem Rápida via WhatsApp',
        desc: 'Lead com interesse explícito. Envie apresentação e solicite detalhes para simulação.',
        channel: 'whatsapp' as TaskType,
        icon: MessageSquare,
        actionLabel: 'WhatsApp Rápido',
      };
    }

    if (phoneClean.length >= 10) {
      return {
        title: 'Apresentação Comercial via WhatsApp',
        desc: 'Abertura amigável apresentando soluções e perguntando o melhor momento para conversar.',
        channel: 'whatsapp' as TaskType,
        icon: MessageSquare,
        actionLabel: 'Iniciar WhatsApp',
      };
    }

    return {
      title: 'Primeiro Contato Telefônico',
      desc: 'Validar dados do lead, apresentar a empresa e verificar interesse inicial.',
      channel: 'call' as TaskType,
      icon: PhoneCall,
      actionLabel: 'Ligar para Lead',
    };
  };

  // Abrir Modal de Registro de Primeira Abordagem
  const handleOpenApproachModal = (contact: Contact) => {
    const reco = getTacticalRecommendation(contact);
    setApproachModalContact(contact);
    setApproachChannel(reco.channel);
    setApproachResultId('interested');
    setApproachNotes('');
    setApproachTemperatureDecision('sem_temperatura');
    setScheduleFollowUpAfterApproach(true);
  };

  // Salvar Registro de Primeira Abordagem
  const handleSaveApproach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approachModalContact) return;

    const contact = approachModalContact;
    const now = new Date().toISOString();
    const resultObj = APPROACH_RESULTS.find((r) => r.id === approachResultId) || APPROACH_RESULTS[0];

    // 1. Registrar a interação de primeira abordagem no histórico
    const interactionSummary = `🎯 1ª Abordagem Comercial (${TASK_TYPE_CONFIG[approachChannel]?.label || 'Contato'}): ${resultObj.label}`;
    
    if (onAddInteraction) {
      onAddInteraction({
        contactId: contact.id,
        type: 'first_approach',
        summary: interactionSummary,
        notes: approachNotes.trim() || undefined,
        date: now,
      });
    } else {
      storageService.addInteraction({
        contactId: contact.id,
        type: 'first_approach',
        summary: interactionSummary,
        notes: approachNotes.trim() || undefined,
        date: now,
      });
    }

    // 2. Determinar nova etapa / temperatura conforme escolha do consultor
    let targetStage = contact.stage;
    let newTemp: 'sem_temperatura' | 'frio' | 'morno' | 'quente' = 'sem_temperatura';

    if (approachTemperatureDecision === 'frio') {
      targetStage = 'contato';
      newTemp = 'frio';
    } else if (approachTemperatureDecision === 'morno') {
      targetStage = 'prospeccao';
      newTemp = 'morno';
    } else if (approachTemperatureDecision === 'quente') {
      targetStage = 'proposta';
      newTemp = 'quente';
    } else if (approachTemperatureDecision === 'cliente') {
      targetStage = 'perdido'; // Cliente convertido
    } else if (approachTemperatureDecision === 'descartado') {
      targetStage = 'perdido'; // Descartado
    } else {
      // Permanece sem temperatura definida! (Regra 5)
      newTemp = 'sem_temperatura';
    }

    // 3. Atualizar o contato
    const updatedContact: Contact = {
      ...contact,
      stage: targetStage,
      temperature: newTemp,
      firstApproachAt: now,
      firstApproachResult: resultObj.label,
      firstApproachChannel: approachChannel,
      lastInteractionDate: now,
      updatedAt: now,
    };

    // 4. Se o consultor confirmou agendamento de próximo passo, salvar
    if (scheduleFollowUpAfterApproach && followUpDateAfterApproach) {
      const followUpIso = `${followUpDateAfterApproach}T${followUpTimeAfterApproach}:00.000Z`;
      updatedContact.nextFollowUpDate = followUpIso;
      updatedContact.followUpLabel = resultObj.nextAction;

      const taskTitle = `${resultObj.nextAction} - ${contact.name}`;
      if (onSaveTask) {
        onSaveTask({
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          company: contact.company,
          dealValue: contact.dealValue,
          title: taskTitle,
          reason: resultObj.nextAction,
          type: approachChannel,
          date: followUpDateAfterApproach,
          time: followUpTimeAfterApproach,
          dueDateTime: followUpIso,
          notes: approachNotes || undefined,
          priority: 'high',
        });
      } else {
        storageService.saveTask({
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          company: contact.company,
          dealValue: contact.dealValue,
          title: taskTitle,
          reason: resultObj.nextAction,
          type: approachChannel,
          date: followUpDateAfterApproach,
          time: followUpTimeAfterApproach,
          dueDateTime: followUpIso,
          notes: approachNotes || undefined,
          priority: 'high',
        });
      }
    }

    storageService.saveContact(updatedContact);

    // Se houve mudança de estágio, dispara callback
    if (targetStage !== contact.stage && onUpdateStage) {
      onUpdateStage(contact.id, targetStage);
    }

    setApproachModalContact(null);
  };

  // 1. Reativar lead para a Fila de Ataque da Zona de Guerra
  const handleReactivateLead = (contact: Contact) => {
    const now = new Date().toISOString();
    const updated: Contact = {
      ...contact,
      firstApproachAt: undefined,
      firstApproachResult: undefined,
      discardReason: undefined,
      temperature: 'sem_temperatura',
      stage: 'contato',
      updatedAt: now,
    };
    storageService.saveContact(updated);
    if (onUpdateStage && contact.stage !== 'contato') {
      onUpdateStage(contact.id, 'contato');
    }
    storageService.addInteraction({
      contactId: contact.id,
      type: 'note',
      summary: '⚔️ Lead reativado para a Fila de Ataque da Zona de Guerra',
      date: now,
    });
  };

  // 2. Mudar categoria de descarte / status (Perdido, Desinteressado, A Recuperar, Lead Morto, Sem Temperatura, Outro)
  const handleChangeDiscardReason = (
    contact: Contact,
    reason: 'sem_temperatura' | 'perdido' | 'desinteressado' | 'recuperar' | 'morto' | 'outro'
  ) => {
    const now = new Date().toISOString();
    const isSemTemp = reason === 'sem_temperatura';
    const updated: Contact = {
      ...contact,
      discardReason: isSemTemp ? undefined : reason,
      temperature: isSemTemp ? 'sem_temperatura' : 'descartado',
      stage: reason === 'recuperar' || isSemTemp ? 'contato' : 'perdido',
      updatedAt: now,
    };
    storageService.saveContact(updated);
    storageService.addInteraction({
      contactId: contact.id,
      type: 'note',
      summary: `Motivo atualizado na Zona de Guerra: ${
        reason === 'perdido' ? '❌ Perdido' :
        reason === 'desinteressado' ? '⚪ Desinteressado' :
        reason === 'recuperar' ? '🔄 A Recuperar' :
        reason === 'morto' ? '💀 Lead Morto' : 
        reason === 'outro' ? '🏷️ Outro Motivo' : '❄️ Sem Temperatura'
      }`,
      date: now,
    });
  };

  // 3. Qualificar Temperatura Comercial diretamente a partir da triagem
  const handleQualifyTemperature = (
    contact: Contact,
    temp: 'frio' | 'morno' | 'quente' | 'cliente'
  ) => {
    const now = new Date().toISOString();
    let targetStage: FunnelStage = 'contato';
    let newTemp: 'sem_temperatura' | 'frio' | 'morno' | 'quente' = 'frio';

    if (temp === 'frio') {
      targetStage = 'contato';
      newTemp = 'frio';
    } else if (temp === 'morno') {
      targetStage = 'prospeccao';
      newTemp = 'morno';
    } else if (temp === 'quente') {
      targetStage = 'proposta';
      newTemp = 'quente';
    } else if (temp === 'cliente') {
      targetStage = 'perdido';
      newTemp = 'quente';
    }

    const updated: Contact = {
      ...contact,
      stage: targetStage,
      temperature: newTemp,
      discardReason: undefined,
      updatedAt: now,
    };
    storageService.saveContact(updated);
    if (onUpdateStage && targetStage !== contact.stage) {
      onUpdateStage(contact.id, targetStage);
    }
    storageService.addInteraction({
      contactId: contact.id,
      type: 'first_approach',
      summary: `🎯 Qualificado comercialmente como: ${
        temp === 'frio' ? '🧊 Frio' : temp === 'morno' ? '⚡ Morno / Vivo' : temp === 'quente' ? '🔥 Quente' : '🏆 Cliente'
      }`,
      date: now,
    });
  };

  return (
    <div className="space-y-4 pb-28 font-sans w-full max-w-full overflow-x-clip animate-fadeIn">
      {/* =========================================================================
          ZONA DE GUERRA: CABEÇALHO TÁTICO E CENTRO DE COMANDO
      ========================================================================= */}
      <div className="sticky top-[50px] sm:top-[60px] z-30 bg-gradient-to-br from-slate-900/98 via-slate-900/98 to-amber-950/90 backdrop-blur-md text-white rounded-2xl sm:rounded-3xl border border-amber-900/40 shadow-xl p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 transition-colors">
        {/* Top Title & Quick Subtabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/30 shrink-0">
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Zona de Guerra</span>
                </h2>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Central
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:block">
                Direcionamento tático, 1ª abordagem e gestão de descartados
              </p>
            </div>
          </div>

          {/* Sub-Tabs: Fila de Ataque vs Sem Temp. & Descartados vs Base Geral */}
          <div className="inline-flex items-center bg-slate-950/80 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-slate-800 self-start sm:self-auto shadow-inner flex-wrap gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setActiveZoneSubTab('attack_queue')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeZoneSubTab === 'attack_queue'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40 scale-102'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Fila Ataque</span>
              <span className={`px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black ${
                activeZoneSubTab === 'attack_queue' ? 'bg-amber-900/80 text-white' : 'bg-slate-800 text-amber-400'
              }`}>
                {pendingAttackCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveZoneSubTab('overdue')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeZoneSubTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 scale-102'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>🚨 Vencidas</span>
              <span className={`px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black ${
                activeZoneSubTab === 'overdue' ? 'bg-rose-950 text-white' : 'bg-slate-800 text-rose-400'
              }`}>
                {overdueContacts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveZoneSubTab('triage_discarded')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeZoneSubTab === 'triage_discarded'
                  ? 'bg-rose-700 text-white shadow-md shadow-rose-700/40 scale-102'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Sem Temp. & Descartados</span>
              <span className={`px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black ${
                activeZoneSubTab === 'triage_discarded' ? 'bg-rose-950 text-white' : 'bg-slate-800 text-rose-300'
              }`}>
                {unclassifiedAndDiscardedContacts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveZoneSubTab('all_contacts')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                activeZoneSubTab === 'all_contacts'
                  ? 'bg-slate-800 text-white shadow-md scale-102'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Base Geral</span>
              <span className="px-1 sm:px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black bg-slate-800 text-slate-300">
                {contacts.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tactical Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-amber-900/30">
            <span className="text-[10px] font-black uppercase text-amber-400 block">⚡ Pendentes de Ataque</span>
            <span className="text-lg sm:text-xl font-black text-white">{pendingAttackCount}</span>
            <span className="text-[10px] text-slate-400 block">Sem 1ª abordagem</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-black uppercase text-sky-400 block">❄️ Sem Temperatura</span>
            <span className="text-lg sm:text-xl font-black text-white">
              {discardedCounts.semTemp}
            </span>
            <span className="text-[10px] text-slate-400 block">Aguardando qualificação</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-black uppercase text-rose-400 block">❌ Descartados / Triagem</span>
            <span className="text-lg sm:text-xl font-black text-white">
              {unclassifiedAndDiscardedContacts.length}
            </span>
            <span className="text-[10px] text-slate-400 block">Perdido, desint., recuperar</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] font-black uppercase text-indigo-400 block">💰 Pipeline Estimado</span>
            <span className="text-lg sm:text-xl font-black text-white truncate block">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPipelineValue)}
            </span>
            <span className="text-[10px] text-slate-400 block">{contacts.length} leads no total</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ABA 1: FILA DE ATAQUE DA ZONA DE GUERRA (LEADS NOVOS SEM 1ª ABORDAGEM)
      ========================================================================= */}
      {activeZoneSubTab === 'attack_queue' && (
        <div className="space-y-3.5">
          {/* Attack Queue Header & Quick Add */}
          <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
            <div className="space-y-0.5">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-500" />
                <span>Leads Novos na Fila de Abordagem</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Execute a abordagem recomendada, registre o resultado e defina o próximo passo com o consultor.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenNewContactModal}
              className="px-3.5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ml-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Novo Lead</span>
            </button>
          </div>

          {/* Cards Grid: Mobile Portrait 1-col, Landscape & Tablet 2-col, Desktop 3-col */}
          {attackQueueContacts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center">
                <Swords className="w-7 h-7" />
              </div>
              <h4 className="font-black text-base text-slate-900 dark:text-white">
                Fila de Ataque Vazia!
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todos os leads da sua base já receberam a primeira abordagem comercial ou estão em andamento no funil.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={onOpenNewContactModal}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  + Cadastrar Novo Lead
                </button>
                {onOpenCsvImport && (
                  <button
                    type="button"
                    onClick={onOpenCsvImport}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Importar Lista CSV
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {attackQueueContacts.map((contact) => {
                const recommendation = getTacticalRecommendation(contact);
                const RecoIcon = recommendation.icon;

                return (
                  <div
                    key={contact.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-500/30 hover:border-amber-500 dark:border-amber-900/40 dark:hover:border-amber-600 shadow-md p-3.5 sm:p-4.5 flex flex-col justify-between transition-all space-y-3 relative group"
                  >
                    {/* Header: Status & Neutral Temperature */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          <span>Pendente 1ª Abordagem</span>
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title="Sem temperatura definida até qualificação">
                          Sem Temperatura
                        </span>
                      </div>

                      {/* Lead Main Info */}
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectContact(contact)}
                          className="font-black text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer flex items-center gap-1.5 group/name"
                        >
                          <User className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="group-hover/name:underline">{contact.name}</span>
                        </button>

                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {contact.company && (
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{contact.company}</span>
                              {contact.role && <span className="text-slate-400">• {contact.role}</span>}
                            </span>
                          )}
                          {contact.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{contact.city}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact Channels */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <PhoneCall className="w-3 h-3 text-slate-400" />
                            <span>{contact.phone}</span>
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1 truncate text-slate-400 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </span>
                        )}
                      </div>

                      {/* Valor Estimado com clique para abrir a aba de editar */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400">Valor Oportunidade:</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditDealValue) onEditDealValue(contact);
                          }}
                          className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-1 cursor-pointer group/val"
                          title="Clique para editar o valor estimado deste lead"
                        >
                          <DollarSign className="w-3 h-3 text-emerald-500 group-hover/val:scale-110" />
                          <span>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue || 0)}
                          </span>
                          <Edit3 className="w-2.5 h-2.5 opacity-60 group-hover/val:opacity-100" />
                        </button>
                      </div>

                      {/* Anotações de Entrada / Origem */}
                      {contact.notes && (
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-bold text-slate-400 block text-[9px] uppercase">Origem / Anotação:</span>
                          <p className="line-clamp-2 italic">"{contact.notes}"</p>
                        </div>
                      )}

                      {/* 🎯 Recomendação Tática de Próxima Ação */}
                      <div className="p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                          <RecoIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Recomendação: {recommendation.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                          {recommendation.desc}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Fast Outreach + Registrar Abordagem */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {/* Fast trigger buttons: WhatsApp, Call, Email */}
                      <div className="flex items-center gap-1.5">
                        {contact.phone && (
                          <>
                            <a
                              href={getWhatsAppUrl(contact.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
                              title="Abrir conversa no WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                            <a
                              href={`tel:${contact.phone}`}
                              className="py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1 border border-indigo-200 dark:border-indigo-800"
                              title="Ligar para o lead"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700"
                            title="Enviar e-mail"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Primary Attack Button: Registrar Primeira Abordagem */}
                      <button
                        type="button"
                        onClick={() => handleOpenApproachModal(contact)}
                        className="w-full py-2.5 px-3 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-600/30 transition-all cursor-pointer"
                      >
                        <Swords className="w-4 h-4 stroke-[2.5]" />
                        <span>🎯 Registrar Primeira Abordagem</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA VENCIDAS / ATRASADOS NA ZONA DE GUERRA
      ========================================================================= */}
      {activeZoneSubTab === 'overdue' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
            <div className="space-y-0.5">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Leads com Compromissos Vencidos / Passados do Prazo</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Leads cujas datas de follow-up ou tarefas venceram retornam automaticamente para a Zona de Guerra para resgate imediato.
              </p>
            </div>
          </div>

          {overdueContacts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-black text-base text-slate-900 dark:text-white">
                Nenhum Lead Vencido!
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Parabéns! Não há nenhum compromisso ou follow-up vencido no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {overdueContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-500/40 hover:border-rose-500 dark:border-rose-900/60 shadow-md p-3.5 sm:p-4.5 flex flex-col justify-between transition-all space-y-3 relative group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>🚨 Vencida / Passou Data</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                        {contact.nextFollowUpDate ? `Data: ${new Date(contact.nextFollowUpDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Atrasado'}
                      </span>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => onSelectContact(contact)}
                        className="font-black text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer flex items-center gap-1.5"
                      >
                        <User className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{contact.name}</span>
                      </button>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {contact.company && (
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{contact.company}</span>
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                            <span>{contact.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <a
                      href={getWhatsAppUrl(contact.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => onSelectContact(contact)}
                      className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Ver & Reagendar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 2: LEADS SEM TEMPERATURA & DESCARTADOS (PERDIDO, DESINTERESSADO, RECUPERAR, LEAD MORTO)
      ========================================================================= */}
      {activeZoneSubTab === 'triage_discarded' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header & Sub-Filtros Rápidos */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-3.5 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                  <span>Central de Triagem: Sem Temperatura & Descartados</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Gerencie leads sem temperatura comercial e descartados (perdidos, desinteressados, a recuperar ou mortos). Reative para nova abordagem ou qualifique.
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar na triagem..."
                  value={discardedSearchTerm}
                  onChange={(e) => setDiscardedSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* Filter Pills: Todos, Sem Temperatura, Desinteressado, Perdido, A Recuperar, Lead Morto */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span>Filtrar:</span>
              </span>

              <button
                type="button"
                onClick={() => setDiscardedFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  discardedFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>Todos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20">
                  {unclassifiedAndDiscardedContacts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiscardedFilter('SEM_TEMP')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  discardedFilter === 'SEM_TEMP'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                }`}
              >
                <span>❄️ Sem Temperatura</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-100">
                  {discardedCounts.semTemp}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiscardedFilter('DESINTERESSADO')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  discardedFilter === 'DESINTERESSADO'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <span>⚪ Desinteressado</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                  {discardedCounts.desinteressado}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiscardedFilter('PERDIDO')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  discardedFilter === 'PERDIDO'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <span>❌ Perdido</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100">
                  {discardedCounts.perdido}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiscardedFilter('RECUPERAR')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  discardedFilter === 'RECUPERAR'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                <span>🔄 A Recuperar</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100">
                  {discardedCounts.recuperar}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiscardedFilter('MORTO')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  discardedFilter === 'MORTO'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
              >
                <span>💀 Lead Morto / Inválido</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                  {discardedCounts.morto}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDiscardedFilter('OUTRO')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  discardedFilter === 'OUTRO'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                }`}
              >
                <span>🏷️ Outros</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100">
                  {discardedCounts.outro}
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid: Proporções otimizadas para Celular Vertical (1-col) e Horizontal / Desktop (2 a 3 cols) */}
          {filteredDiscardedContacts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h4 className="font-black text-base text-slate-900 dark:text-white">
                Nenhum lead nesta categoria de triagem!
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há leads cadastrados como sem temperatura ou descartados com os filtros atuais selecionados.
              </p>
              {discardedFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setDiscardedFilter('ALL')}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-md cursor-pointer"
                >
                  Ver Todos ({unclassifiedAndDiscardedContacts.length})
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredDiscardedContacts.map((contact) => {
                const isSemTemp = !contact.temperature || contact.temperature === 'sem_temperatura';
                const reason = contact.discardReason;

                // Status Badge Color & Text
                let badgeLabel = '❄️ Sem Temperatura';
                let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';

                if (reason === 'recuperar') {
                  badgeLabel = '🔄 A Recuperar';
                  badgeStyle = 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
                } else if (reason === 'desinteressado') {
                  badgeLabel = '⚪ Desinteressado';
                  badgeStyle = 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
                } else if (reason === 'perdido' || contact.stage === 'perdido') {
                  badgeLabel = '❌ Perdido';
                  badgeStyle = 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
                } else if (reason === 'morto' || reason === 'invalido') {
                  badgeLabel = '💀 Lead Morto';
                  badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                } else if (reason === 'outro') {
                  badgeLabel = '🏷️ Outro Motivo';
                  badgeStyle = 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
                }

                return (
                  <div
                    key={contact.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm p-3.5 sm:p-4.5 flex flex-col justify-between transition-all space-y-3 relative group"
                  >
                    <div className="space-y-2">
                      {/* Top Header: Badge + Stage info */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeStyle}`}>
                          {badgeLabel}
                        </span>

                        {contact.stage && STAGE_CONFIG[contact.stage] && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STAGE_CONFIG[contact.stage].bg} ${STAGE_CONFIG[contact.stage].color} ${STAGE_CONFIG[contact.stage].border}`}>
                            Etapa: {STAGE_CONFIG[contact.stage].label}
                          </span>
                        )}
                      </div>

                      {/* Lead Name & Contact Details */}
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectContact(contact)}
                          className="font-black text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer flex items-center gap-1.5 group/name"
                        >
                          <User className="w-4 h-4 text-slate-400 group-hover/name:text-indigo-500 shrink-0" />
                          <span className="group-hover/name:underline">{contact.name}</span>
                        </button>

                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {contact.company && (
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{contact.company}</span>
                              {contact.role && <span className="text-slate-400">• {contact.role}</span>}
                            </span>
                          )}
                          {contact.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{contact.city}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Communication Channels */}
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                        {contact.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 text-[11px] font-mono">
                              <PhoneCall className="w-3 h-3 text-slate-400" />
                              <span>{contact.phone}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sem telefone</span>
                        )}

                        {/* Direct Fast WhatsApp / Call buttons */}
                        <div className="flex items-center gap-1">
                          {contact.phone && (
                            <>
                              <a
                                href={getWhatsAppUrl(contact.phone, `Olá ${contact.name}, tudo bem? Sou da equipe comercial...`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                title="Enviar mensagem via WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`tel:${contact.phone.replace(/\D/g, '')}`}
                                className="p-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 transition-colors"
                                title="Ligar para lead"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Deal Value */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400">Valor Oportunidade:</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditDealValue) onEditDealValue(contact);
                          }}
                          className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-1 cursor-pointer group/val"
                          title="Clique para editar valor estimado"
                        >
                          <DollarSign className="w-3 h-3 text-emerald-500 group-hover/val:scale-110" />
                          <span>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue || 0)}
                          </span>
                          <Edit3 className="w-2.5 h-2.5 opacity-60 group-hover/val:opacity-100" />
                        </button>
                      </div>

                      {/* Notes / Reason */}
                      {(contact.notes || contact.firstApproachResult) && (
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300">
                          {contact.firstApproachResult && (
                            <span className="font-bold text-rose-500 dark:text-rose-400 block text-[9px] uppercase">
                              Resultado Abordagem: {contact.firstApproachResult}
                            </span>
                          )}
                          {contact.notes && (
                            <p className="line-clamp-2 italic text-[11px] mt-0.5">"{contact.notes}"</p>
                          )}
                        </div>
                      )}

                      {/* Quick Reason Classification Selector Chips */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">
                          Classificação Rápida de Descarte / Triagem:
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleChangeDiscardReason(contact, 'recuperar')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              reason === 'recuperar'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            🔄 A Recuperar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeDiscardReason(contact, 'desinteressado')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              reason === 'desinteressado'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            ⚪ Desinteressado
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeDiscardReason(contact, 'perdido')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              reason === 'perdido'
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            ❌ Perdido
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeDiscardReason(contact, 'morto')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              reason === 'morto' || reason === 'invalido'
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            💀 Lead Morto
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeDiscardReason(contact, 'sem_temperatura')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              isSemTemp && !reason
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            ❄️ Sem Temp.
                          </button>

                          <button
                            type="button"
                            onClick={() => handleChangeDiscardReason(contact, 'outro')}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              reason === 'outro'
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            🏷️ Outro
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {/* 1. Reativar Lead para Fila de Ataque */}
                      <button
                        type="button"
                        onClick={() => handleReactivateLead(contact)}
                        className="w-full py-2 px-3 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/30 transition-all cursor-pointer"
                        title="Traz o lead de volta para a Fila de Ataque inicial da Zona de Guerra"
                      >
                        <Swords className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>🎯 Reativar Lead (Fila de Ataque)</span>
                      </button>

                      {/* 2. Agendar Resgate / Follow-Up na Agenda */}
                      <button
                        type="button"
                        onClick={() => setFollowUpContactToSchedule(contact)}
                        className="w-full py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>📅 Agendar Resgate na Agenda</span>
                      </button>

                      {/* 3. Seletor de Qualificação de Temperatura (caso o lead responda) */}
                      <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Qualificar:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQualifyTemperature(contact, 'frio')}
                            className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-extrabold hover:bg-sky-100 cursor-pointer"
                            title="Mover para etapa Frio"
                          >
                            🧊 Frio
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQualifyTemperature(contact, 'morno')}
                            className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-extrabold hover:bg-blue-100 cursor-pointer"
                            title="Mover para etapa Vivo / Morno"
                          >
                            ⚡ Morno
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQualifyTemperature(contact, 'quente')}
                            className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-extrabold hover:bg-amber-100 cursor-pointer"
                            title="Mover para etapa Quente"
                          >
                            🔥 Quente
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 3: BASE GERAL DE CONTATOS (PRESERVA 100% DOS DADOS E FILTROS)
      ========================================================================= */}
      {activeZoneSubTab === 'all_contacts' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Tags, New Contact, CSV Import/Export */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-3.5 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, telefone, empresa, cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={onManageTags}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  <span>Etiquetas</span>
                </button>

                {onOpenCsvImport && (
                  <button
                    type="button"
                    onClick={onOpenCsvImport}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Importar contatos de arquivo CSV"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CSV</span>
                  </button>
                )}

                {onExportCsv && (
                  <button
                    type="button"
                    onClick={onExportCsv}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                    title="Exportar base para CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenNewContactModal}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Novo Lead</span>
                </button>
              </div>
            </div>

            {/* Stage filter chips & View Mode switcher */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedStage('ALL')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedStage === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Todos ({contacts.length})
                </button>

                {Object.entries(STAGE_CONFIG).map(([k, cfg]) => {
                  const count = contacts.filter((c) => c.stage === k).length;
                  const isSel = selectedStage === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedStage(k as FunnelStage)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSel
                          ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-indigo-400`
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                      }`}
                    >
                      {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* View Switcher */}
              <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Tabela
                </button>
              </div>
            </div>
          </div>

          {/* List/Grid of All Contacts */}
          {filteredAllContacts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Nenhum contato encontrado com os filtros aplicados.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAllContacts.map((contact) => {
                const stageConfig = STAGE_CONFIG[contact.stage] || STAGE_CONFIG.contato;
                return (
                  <div
                    key={contact.id}
                    onClick={() => onSelectContact(contact)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white hover:text-indigo-600">
                          {contact.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-semibold">
                          {contact.company || 'Pessoa Física'} {contact.role ? `• ${contact.role}` : ''}
                        </p>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                        {stageConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>📞 {contact.phone}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditDealValue) onEditDealValue(contact);
                        }}
                        className="font-black text-emerald-600 hover:underline"
                      >
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue || 0)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-black uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nome</th>
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Telefone</th>
                    <th className="p-3">Etapa</th>
                    <th className="p-3 text-right">Valor Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAllContacts.map((c) => {
                    const cfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.contato;
                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => onSelectContact(c)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      >
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{c.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{c.company || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{c.phone}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-emerald-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(c.dealValue || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: REGISTRAR PRIMEIRA ABORDAGEM COMERCIAL (FLUXO OPERACIONAL ZONA DE GUERRA)
      ========================================================================= */}
      {approachModalContact && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
          onClick={() => setApproachModalContact(null)}
        >
          <div 
            className="w-full max-w-lg bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Swords className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Registrar 1ª Abordagem Comercial
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-[260px]">
                    {approachModalContact.name} {approachModalContact.phone ? `• ${approachModalContact.phone}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setApproachModalContact(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveApproach} className="space-y-4 text-xs">
              {/* Canal Utilizado */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-amber-400">
                  Canal Utilizado na Abordagem *
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'whatsapp' as TaskType, label: 'WhatsApp', icon: MessageSquare },
                    { id: 'call' as TaskType, label: 'Ligação', icon: PhoneCall },
                    { id: 'email' as TaskType, label: 'E-mail', icon: Mail },
                    { id: 'meeting' as TaskType, label: 'Reunião', icon: MapPin },
                  ].map((ch) => {
                    const isSel = approachChannel === ch.id;
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setApproachChannel(ch.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md scale-102 font-black'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resultado da Abordagem */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-slate-300">
                  Resultado Efetivo da Abordagem *
                </label>
                <div className="space-y-1">
                  {APPROACH_RESULTS.map((res) => {
                    const isSel = approachResultId === res.id;
                    return (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => {
                          setApproachResultId(res.id);
                          // Sugestão de temperatura automática dependendo da resposta
                          if (res.id === 'interested') {
                            setApproachTemperatureDecision('morno');
                          } else {
                            setApproachTemperatureDecision('sem_temperatura');
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-amber-950/60 text-white border-amber-500 shadow-xs'
                            : 'bg-slate-800/70 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{res.icon}</span>
                          <span className="font-bold">{res.label}</span>
                        </span>
                        {isSel && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anotações da Abordagem */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-300">
                  Anotações da Conversa / O que o Cliente Disse
                </label>
                <textarea
                  rows={2}
                  value={approachNotes}
                  onChange={(e) => setApproachNotes(e.target.value)}
                  placeholder="Ex: Demonstrou interesse no plano trimestral, pediu proposta detalhada para analisar com o sócio..."
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Recomendação de Próximo Passo Dinâmica */}
              {(() => {
                const currentRes = APPROACH_RESULTS.find((r) => r.id === approachResultId) || APPROACH_RESULTS[0];
                return (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-400 block">
                      ⚡ Recomendação de Próximo Passo:
                    </span>
                    <p className="text-xs font-bold text-white">
                      {currentRes.nextAction}
                    </p>
                  </div>
                );
              })()}

              {/* Decisão de Temperatura Comercial com Confirmação do Consultor (Regra 5) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-black uppercase text-slate-300">
                  Temperatura Comercial (Confirmação do Consultor) *
                </label>
                <p className="text-[10px] text-slate-400">
                  Não classifique automaticamente como frio se o lead não respondeu. Escolha o destino comercial:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                  {[
                    { id: 'sem_temperatura', label: 'Sem Temperatura', desc: 'Permanece em abordagem', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
                    { id: 'frio', label: '🧊 Frio', desc: 'Interesse distante / longo prazo', badge: 'bg-sky-950 text-sky-300 border-sky-800' },
                    { id: 'morno', label: '⚡ Morno / Vivo', desc: 'Interesse ativo em qualificação', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
                    { id: 'quente', label: '🔥 Quente', desc: 'Pronto para proposta / negociação', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
                    { id: 'cliente', label: '🏆 Cliente', desc: 'Venda fechada / Convertido', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
                    { id: 'descartado', label: '❌ Descartado', desc: 'Sem interesse definitivo', badge: 'bg-rose-950 text-rose-300 border-rose-800' },
                  ].map((temp) => {
                    const isSel = approachTemperatureDecision === temp.id;
                    return (
                      <button
                        key={temp.id}
                        type="button"
                        onClick={() => setApproachTemperatureDecision(temp.id)}
                        className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSel
                            ? 'ring-2 ring-amber-400 bg-slate-800 font-black border-amber-400'
                            : `${temp.badge} opacity-80 hover:opacity-100`
                        }`}
                      >
                        <span className="font-bold text-xs">{temp.label}</span>
                        <span className="text-[9px] text-slate-400 leading-tight">{temp.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Agendamento na Agenda */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleFollowUpAfterApproach}
                    onChange={(e) => setScheduleFollowUpAfterApproach(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-800 border-slate-700 cursor-pointer"
                  />
                  <span className="font-bold text-slate-200">
                    Agendar próximo retorno / tarefa na Agenda
                  </span>
                </label>

                {scheduleFollowUpAfterApproach && (
                  <div className="grid grid-cols-2 gap-2 pl-6 animate-fadeIn">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Data do Retorno</span>
                      <input
                        type="date"
                        value={followUpDateAfterApproach}
                        onChange={(e) => setFollowUpDateAfterApproach(e.target.value)}
                        className="w-full p-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white"
                        required={scheduleFollowUpAfterApproach}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold mb-0.5">Horário</span>
                      <input
                        type="time"
                        value={followUpTimeAfterApproach}
                        onChange={(e) => setFollowUpTimeAfterApproach(e.target.value)}
                        className="w-full p-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white"
                        required={scheduleFollowUpAfterApproach}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setApproachModalContact(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar & Salvar Abordagem</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agendar Retorno & Follow-Up na Agenda para Resgate e Recuperação */}
      {followUpContactToSchedule && (
        <ScheduleFollowUpModal
          isOpen={!!followUpContactToSchedule}
          contact={followUpContactToSchedule}
          onClose={() => setFollowUpContactToSchedule(null)}
          onSave={(data) => {
            if (onUpdateFollowUp) {
              onUpdateFollowUp(data.contactId, data.followUpLabel, data.isoDateTime, data.notes);
            } else {
              const c = storageService.getContactById(data.contactId);
              if (c) {
                storageService.saveContact({
                  ...c,
                  nextFollowUpDate: data.isoDateTime,
                  followUpLabel: data.followUpLabel,
                });
                storageService.saveTask({
                  contactId: c.id,
                  contactName: c.name,
                  contactPhone: c.phone,
                  company: c.company,
                  dealValue: c.dealValue,
                  title: `${data.followUpLabel} - ${c.name}`,
                  reason: data.followUpLabel,
                  type: 'follow_up',
                  date: data.date,
                  time: data.time,
                  dueDateTime: data.isoDateTime,
                  notes: data.notes,
                  priority: 'high',
                });
              }
            }
            setFollowUpContactToSchedule(null);
          }}
        />
      )}
    </div>
  );
};
