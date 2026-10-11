export type InteractionType = 
  | 'call' 
  | 'whatsapp' 
  | 'email' 
  | 'meeting' 
  | 'proposal' 
  | 'note' 
  | 'task'
  | 'stage_change'
  | 'response_logged'
  | 'first_approach'
  | 'task_completed';

export type FunnelStage = 
  | 'contato' 
  | 'prospeccao' 
  | 'proposta' 
  | 'perdido';

export type TaskType = 
  | 'call' 
  | 'whatsapp' 
  | 'return' 
  | 'meeting' 
  | 'follow_up' 
  | 'proposal' 
  | 'contact'
  | 'event'
  | 'other';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  title: string;
  type: TaskType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  dueDateTime: string; // ISO string for quick sorting & comparisons
  notes?: string;
  completed: boolean;
  completedAt?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  eventId?: string; // Vínculo com o evento externo salvo em Eventos
  eventVenue?: string;
  eventCategory?: EventCategory;
  reason?: string; // Motivo do contato/agendamento
  dealValue?: number;
  company?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex
  bgHex?: string;
  textHex?: string;
  description?: string;
}

export interface Interaction {
  id: string;
  contactId: string;
  type: InteractionType;
  summary: string;
  notes?: string;
  date: string; // ISO string
  nextFollowUp?: string; // ISO string
  dealValueSnapshot?: number;
  authorName?: string;
  previousStage?: FunnelStage;
  newStage?: FunnelStage;
  stageChangeReason?: string;
  responseType?: string;
  taskId?: string;
  synced: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  role: string;
  avatarUrl?: string;
  tagIds: string[];
  stage: FunnelStage;
  dealValue: number;
  lastInteractionDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  city?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  
  // Próxima Ação comercial
  nextFollowUpDate?: string; // ISO string (e.g. 2026-10-15T14:00:00.000Z)
  followUpLabel?: string;    // e.g. "1º Contato", "Retorno", "Reunião"
  nextActionType?: TaskType;
  nextActionTitle?: string;
  nextActionDate?: string;   // YYYY-MM-DD
  nextActionTime?: string;   // HH:mm
  nextActionNotes?: string;
  nextActionCompleted?: boolean;
  tasks?: Task[];

  // Zona de Guerra - Entrada e Abordagem
  firstApproachAt?: string;
  firstApproachResult?: string;
  firstApproachChannel?: TaskType;
  temperature?: 'sem_temperatura' | 'frio' | 'morno' | 'quente' | 'descartado';
  discardReason?: 'perdido' | 'desinteressado' | 'recuperar' | 'morto' | 'invalido' | 'outro' | string;
}

export interface PendingSyncItem {
  id: string;
  action: 'CREATE_CONTACT' | 'UPDATE_CONTACT' | 'DELETE_CONTACT' | 'LOG_INTERACTION' | 'CREATE_TAG' | 'DELETE_TAG' | 'SAVE_TASK' | 'DELETE_TASK' | 'SAVE_EVENT' | 'DELETE_EVENT';
  entityId: string;
  payload: any;
  timestamp: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  serverConnected: boolean;
}

export interface LeadIndicators {
  leadsParados: number;         // Sem contato há mais de 3 dias
  retornosPendentes: number;    // Tarefas de retorno/follow-up pendentes
  contatosRealizados: number;   // Interações de contato realizadas
  respostasRecebidas: number;   // Respostas registradas dos clientes
  avancos: number;              // Avanços de etapa no funil
  vendas: number;               // Ganhos/Clientes convertidos
  semProximaAcao: number;       // Leads sem nenhuma próxima ação agendada
  tarefasVencidas: number;      // Tarefas atrasadas
  tarefasHoje: number;          // Tarefas marcadas para hoje
  totalLeads: number;           // Total geral de leads
}

export interface CRMStats {
  totalContacts: number;
  totalPipelineValue: number;
  wonValue: number;
  wonCount: number;
  lostCount: number;
  conversionRate: number;
  todayInteractionsCount: number;
  pendingFollowUpsCount: number;
  averageTicket: number;
}

export const STAGE_CONFIG: Record<FunnelStage, { label: string; color: string; bg: string; border: string }> = {
  contato: { label: 'Frio', color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-300 dark:border-sky-800' },
  prospeccao: { label: 'Vivo', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-300 dark:border-blue-800' },
  proposta: { label: 'Quente', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-800' },
  perdido: { label: 'Clientes', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-800' },
};

export const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: string; color: string; bg: string; border: string }> = {
  call: { label: 'Ligação', icon: 'PhoneCall', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/50', border: 'border-sky-300 dark:border-sky-800' },
  whatsapp: { label: 'WhatsApp', icon: 'MessageSquare', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-300 dark:border-emerald-800' },
  return: { label: 'Retorno', icon: 'RotateCcw', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-300 dark:border-indigo-800' },
  meeting: { label: 'Reunião', icon: 'Users', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-300 dark:border-purple-800' },
  follow_up: { label: 'Follow-up', icon: 'Clock', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-300 dark:border-amber-800' },
  proposal: { label: 'Proposta', icon: 'FileText', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-300 dark:border-rose-800' },
  contact: { label: 'Contato', icon: 'UserCheck', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/50', border: 'border-teal-300 dark:border-teal-800' },
  event: { label: 'Evento', icon: 'CalendarDays', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-300 dark:border-purple-800' },
  other: { label: 'Outra Ação', icon: 'CheckCircle2', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-700' },
};

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  company?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
  token?: string;
}

// ================= EVENTOS COMERCIAIS & INTEGRAÇÃO DE AGENDA =================

export type EventCategory = 
  | 'business'               // 1. Empresariais
  | 'real_estate'            // 2. Imóveis
  | 'agro'                   // 3. Agro
  | 'automotive_nautical'    // 4. Automotivos e náuticos
  | 'investments'            // 5. Investimentos
  | 'local_fairs'            // 6. Feiras locais
  | 'tech_innovation'        // 7. Tecnologia e inovação
  | 'public_networking';     // 8. Eventos públicos e networking

export interface EventCategoryConfig {
  id: EventCategory;
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  badgeHex: string;
  description: string;
}

export const EVENT_CATEGORIES_CONFIG: Record<EventCategory, EventCategoryConfig> = {
  business: {
    id: 'business',
    label: 'Empresariais',
    icon: 'Briefcase',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    badgeHex: '#2563eb',
    description: 'Encontros empresariais, associações comerciais, rodadas de negócios e liderança'
  },
  real_estate: {
    id: 'real_estate',
    label: 'Imóveis',
    icon: 'Building2',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeHex: '#059669',
    description: 'Salões imobiliários, lançamentos residenciais, leilões, construção civil e urbanismo'
  },
  agro: {
    id: 'agro',
    label: 'Agro',
    icon: 'Sprout',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    badgeHex: '#d97706',
    description: 'Feiras agropecuárias, dias de campo, exposições de maquinário, grãos e pecuária'
  },
  automotive_nautical: {
    id: 'automotive_nautical',
    label: 'Automotivos e náuticos',
    icon: 'Car',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    badgeHex: '#ea580c',
    description: 'Salões de automóveis, náutica, frotas, caminhões, barcos e esportes a motor'
  },
  investments: {
    id: 'investments',
    label: 'Investimentos',
    icon: 'TrendingUp',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
    badgeHex: '#4f46e5',
    description: 'Fóruns de investimentos, capitais, consórcios, venture capital e finanças'
  },
  local_fairs: {
    id: 'local_fairs',
    label: 'Feiras locais',
    icon: 'Store',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    badgeHex: '#e11d48',
    description: 'Exposições regionais, feiras multissetoriais e eventos de comércio municipal'
  },
  tech_innovation: {
    id: 'tech_innovation',
    label: 'Tecnologia e inovação',
    icon: 'Cpu',
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-200 dark:border-cyan-800',
    badgeHex: '#0891b2',
    description: 'Congresso de tecnologia, inteligência artificial, transformação digital e startups'
  },
  public_networking: {
    id: 'public_networking',
    label: 'Eventos públicos e networking',
    icon: 'Users2',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    badgeHex: '#9333ea',
    description: 'Cafés de negócios, palestras públicas, seminários e encontros de networking'
  },
};

export type EventVerificationStatus = 
  | 'confirmed'             // Confirmado pela fonte
  | 'partially_verified'    // Parcialmente verificado
  | 'pending'               // Aguardando confirmação
  | 'possibly_canceled'     // Possivelmente cancelado
  | 'canceled'              // Cancelado confirmado
  | 'date_changed'          // Data alterada
  | 'ended'                 // Encerrado
  | 'possible_duplicate';   // Possível duplicidade

export const VERIFICATION_STATUS_CONFIG: Record<EventVerificationStatus, { label: string; color: string; bg: string; border: string }> = {
  confirmed: { label: 'Confirmado pela fonte', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-300 dark:border-emerald-800' },
  partially_verified: { label: 'Parcialmente verificado', color: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/50', border: 'border-sky-300 dark:border-sky-800' },
  pending: { label: 'Aguardando confirmação', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-300 dark:border-amber-800' },
  possibly_canceled: { label: 'Possivelmente cancelado', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/50', border: 'border-orange-300 dark:border-orange-800' },
  canceled: { label: 'Cancelado confirmado', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-300 dark:border-rose-800' },
  date_changed: { label: 'Data alterada', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-300 dark:border-purple-800' },
  ended: { label: 'Encerrado', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-700' },
  possible_duplicate: { label: 'Possível duplicidade', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-950/50', border: 'border-yellow-300 dark:border-yellow-800' },
};

export interface ExternalEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  startDate: string; // ISO ou YYYY-MM-DDTHH:mm
  endDate?: string;
  dateStr: string;   // YYYY-MM-DD para agrupamentos
  timeStr?: string;  // HH:mm
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  coordinates?: { lat: number; lng: number };
  distanceKm?: number;
  distanceType?: 'straight' | 'road';
  organizer?: string;
  originalUrl: string;
  source: string;
  verificationStatus: EventVerificationStatus;
  lastVerifiedAt: string;
  commercialScore: number; // 0 a 100
  scoreReasons: string[];
}

export interface SavedEvent {
  id: string;
  externalEventId: string;
  userId?: string;
  title: string;
  description?: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  endDate?: string;
  endTime?: string;
  venue?: string;
  address?: string;
  city?: string;
  organizer?: string;
  originalUrl?: string;
  sourceUrl?: string;
  source?: string;
  commercialScore: number;
  scoreReasons?: string[];
  commercialNotes?: string;
  verificationStatus: EventVerificationStatus;
  addedToPersonalAgenda: boolean;
  personalTaskId?: string;
  savedAt: string;
  updatedAt?: string;
}

export interface EventSearchConfig {
  userId?: string;
  cep?: string; // Opcional!
  city?: string;
  state?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  radiusKm: number; // Padrão: 50 km
  periodShortcut: '7d' | '30d' | '90d' | 'custom';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  categories: EventCategory[];
  autoSearchEnabled: boolean; // Padrão: false
  autoSearchFrequency?: 'daily' | 'weekly';
  lastSearchAt?: string;
  updatedAt: string;
}

export interface EventSearchHistory {
  id: string;
  executedAt: string;
  cep?: string;
  city?: string;
  radiusKm: number;
  startDate: string;
  endDate: string;
  categories: EventCategory[];
  sourcesConsulted: string[];
  failedSources: string[];
  resultsCount: number;
  duplicatesCount: number;
  status: 'completed' | 'partial' | 'empty' | 'failed' | 'incomplete_config';
  errorMessage?: string;
}
