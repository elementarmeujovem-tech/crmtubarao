import { 
  Contact, 
  Tag, 
  Interaction, 
  PendingSyncItem, 
  FunnelStage, 
  InteractionType, 
  User,
  Task,
  TaskType,
  LeadIndicators,
  STAGE_CONFIG,
  SavedEvent,
  EventSearchConfig,
  EventSearchHistory,
  EventCategory
} from '../types';
import { toLocalDateString } from '../utils/calendarSync';

const getStorageKey = (key: string, email: string) => `${key}_${email}`;

const STORAGE_KEYS = {
  CONTACTS: 'crm_mobile_contacts_v1',
  TAGS: 'crm_mobile_tags_v1',
  INTERACTIONS: 'crm_mobile_interactions_v1',
  TASKS: 'crm_mobile_tasks_v1',
  SAVED_EVENTS: 'crm_mobile_saved_events_v1',
  EVENT_SEARCH_CONFIG: 'crm_mobile_event_search_config_v1',
  EVENT_SEARCH_HISTORY: 'crm_mobile_event_search_history_v1',
  SYNC_QUEUE: 'crm_mobile_sync_queue_v1',
  LAST_SYNC: 'crm_mobile_last_sync_v1',
  USERS: 'crm_mobile_users_v1',
  CURRENT_USER: 'crm_mobile_current_user_v1',
  REMEMBERED_EMAIL: 'crm_mobile_remembered_email_v1',
  DELETED_CONTACTS: 'crm_mobile_deleted_contacts_v1',
};

// Default initial users
export const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-1',
    name: 'Gestor Comercial',
    email: 'admin@somacrm.com',
    password: 'admin',
    role: 'Administrador / Gestor',
    company: 'Soma CRM Pro',
    phone: '(11) 99876-5432',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: 'usr-consultor-2',
    name: 'Carlos Oliveira',
    email: 'vendas@somacrm.com',
    password: '123',
    role: 'Consultor de Vendas',
    company: 'Soma CRM Pro',
    phone: '(11) 98765-4321',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }
];

// Default initial basic tags requested by user
export const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-casa', name: 'Casa', color: 'emerald', bgHex: '#d1fae5', textHex: '#047857', description: 'Interesse imobiliário, residencial ou terreno' },
  { id: 'tag-carro', name: 'Carro', color: 'sky', bgHex: '#e0f2fe', textHex: '#0369a1', description: 'Interesse em veículos, automóveis e carros' },
  { id: 'tag-investimento', name: 'Investimento', color: 'indigo', bgHex: '#e0e7ff', textHex: '#4338ca', description: 'Foco em investimento, rentabilidade ou consórcio' },
  { id: 'tag-sem-dinheiro', name: 'Sem Dinheiro', color: 'rose', bgHex: '#ffe4e6', textHex: '#e11d48', description: 'Sem recurso financeiro ou verba no momento' },
  { id: 'tag-agro', name: 'Agro', color: 'amber', bgHex: '#fef3c7', textHex: '#b45309', description: 'Setor agropecuário, máquinas agrícolas ou produtor' },
  { id: 'tag-caminhao', name: 'Caminhão', color: 'orange', bgHex: '#ffedd5', textHex: '#c2410c', description: 'Interesse em caminhões, frotas e veículos pesados' },
  { id: 'tag-follow-up', name: 'Follow Up', color: 'purple', bgHex: '#f3e8ff', textHex: '#7e22ce', description: 'Acompanhamento e retorno contínuo' },
  { id: 'tag-cliente-analitico', name: 'Cliente Analítico', color: 'cyan', bgHex: '#cffafe', textHex: '#0e7490', description: 'Perfil focado em dados, detalhes e simulações' },
  { id: 'tag-cliente-direto', name: 'Cliente Direto', color: 'blue', bgHex: '#dbeafe', textHex: '#1d4ed8', description: 'Perfil objetivo, direto ao ponto e decidido' },
  { id: 'tag-cliente-amigo', name: 'Cliente Amigo', color: 'teal', bgHex: '#ccfbf1', textHex: '#0f766e', description: 'Perfil relacional, empático e de confiança' },
  { id: 'tag-cliente-empolgado', name: 'Cliente Empolgado', color: 'pink', bgHex: '#fce7f3', textHex: '#be185d', description: 'Perfil motivado, entusiasmado e pronto para fechar' },
];

const LEGACY_TAG_NAMES = new Set([
  'lead quente',
  'vip / key account',
  'vip',
  'tomador de decisão',
  'tomador de decisao',
  'cliente ativo',
  'lead frio',
  'aguardando proposta',
  'pós-venda',
  'pos-venda',
  'cliente técnico',
  'cliente tecnico'
]);

export function sanitizeAndMigrateTags(loadedTags: Tag[]): Tag[] {
  let filtered = (Array.isArray(loadedTags) ? loadedTags : []).filter((t) => {
    if (!t || !t.name) return false;
    const norm = t.name.trim().toLowerCase();
    return !LEGACY_TAG_NAMES.has(norm) && !['tag-1', 'tag-2', 'tag-3', 'tag-4', 'tag-5', 'tag-6', 'tag-7', 'tag-cliente-tecnico'].includes(t.id);
  });

  // Ensure all 11 basic tags are available
  DEFAULT_TAGS.forEach((def) => {
    const exists = filtered.some((t) => t.name.trim().toLowerCase() === def.name.toLowerCase() || t.id === def.id);
    if (!exists) {
      filtered.push({ ...def });
    }
  });

  return filtered;
}

// Default initial mock contacts (empty for clean user database)
export const DEFAULT_CONTACTS: Contact[] = [];

export const DEFAULT_INTERACTIONS: Interaction[] = [];

type ChangeListener = () => void;

class StorageService {
  private contacts: Contact[] = [];
  private tags: Tag[] = [];
  private interactions: Interaction[] = [];
  private tasks: Task[] = [];
  private savedEvents: SavedEvent[] = [];
  private eventSearchConfig: EventSearchConfig | null = null;
  private eventSearchHistory: EventSearchHistory[] = [];
  private pendingQueue: PendingSyncItem[] = [];
  private lastSyncTime: string | null = null;
  private users: User[] = [];
  private currentUser: User | null = null;
  private deletedContactIds: string[] = [];
  private listeners: Set<ChangeListener> = new Set();
  private isSyncInProgress = false;

  constructor() {
    this.init();
    if (this.currentUser) {
      this.loadUserData(this.currentUser.email);
    }
    this.setupAutoSync();
  }

  private init() {
    try {
      const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      const rawCurrentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);

      this.users = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS;
      this.currentUser = rawCurrentUser ? JSON.parse(rawCurrentUser) : null;
    } catch (err) {
      console.error('Error initializing storage service:', err);
      this.users = DEFAULT_USERS;
      this.currentUser = null;
    }
  }

  private loadUserData(email: string) {
    try {
      const rawContacts = localStorage.getItem(getStorageKey(STORAGE_KEYS.CONTACTS, email));
      const rawTags = localStorage.getItem(getStorageKey(STORAGE_KEYS.TAGS, email));
      const rawInteractions = localStorage.getItem(getStorageKey(STORAGE_KEYS.INTERACTIONS, email));
      const rawTasks = localStorage.getItem(getStorageKey(STORAGE_KEYS.TASKS, email));
      const rawSavedEvents = localStorage.getItem(getStorageKey(STORAGE_KEYS.SAVED_EVENTS, email));
      const rawEventConfig = localStorage.getItem(getStorageKey(STORAGE_KEYS.EVENT_SEARCH_CONFIG, email));
      const rawEventHistory = localStorage.getItem(getStorageKey(STORAGE_KEYS.EVENT_SEARCH_HISTORY, email));
      const rawQueue = localStorage.getItem(getStorageKey(STORAGE_KEYS.SYNC_QUEUE, email));
      const rawSync = localStorage.getItem(getStorageKey(STORAGE_KEYS.LAST_SYNC, email));
      const rawDeleted = localStorage.getItem(getStorageKey(STORAGE_KEYS.DELETED_CONTACTS, email));

      this.deletedContactIds = rawDeleted ? JSON.parse(rawDeleted) : [];

      const loadedTags = rawTags ? JSON.parse(rawTags) : DEFAULT_TAGS;
      this.tags = sanitizeAndMigrateTags(loadedTags);
      this.saveTags();

      const validTagIds = new Set(this.tags.map(t => t.id));
      const parsedContacts = (rawContacts ? JSON.parse(rawContacts) : DEFAULT_CONTACTS)
        .filter((c: any) => c && !this.deletedContactIds.includes(c.id))
        .map((c: any) => {
          let validStage: FunnelStage = c.stage;
          if ((c.stage as string) === 'qualificacao') validStage = 'prospeccao';
          else if ((c.stage as string) === 'negociacao') validStage = 'proposta';
          else if ((c.stage as string) === 'ganho') validStage = 'proposta';
          else if (!['contato', 'prospeccao', 'proposta', 'perdido'].includes(c.stage)) validStage = 'contato';
          return { 
            ...c, 
            stage: validStage,
            tagIds: Array.isArray(c.tagIds) ? c.tagIds.filter((tId: string) => validTagIds.has(tId)) : []
          };
        });

      this.contacts = parsedContacts;
      this.interactions = (rawInteractions ? JSON.parse(rawInteractions) : DEFAULT_INTERACTIONS)
        .filter((i: any) => !this.deletedContactIds.includes(i.contactId));
      this.tasks = (rawTasks ? JSON.parse(rawTasks) : [])
        .filter((t: any) => !this.deletedContactIds.includes(t.contactId) && !this.deletedContactIds.includes(t.id));
      this.savedEvents = rawSavedEvents ? JSON.parse(rawSavedEvents) : [];
      this.eventSearchConfig = rawEventConfig ? JSON.parse(rawEventConfig) : null;
      this.eventSearchHistory = rawEventHistory ? JSON.parse(rawEventHistory) : [];

      this.pendingQueue = rawQueue ? JSON.parse(rawQueue) : [];
      this.lastSyncTime = rawSync || new Date().toISOString();
      
      this.notifyListeners();
    } catch (err) {
      console.error('Error loading user data:', err);
      // Reset user-specific state if load fails
    }
  }

  private setupAutoSync() {
    // Initial sync from cloud server on start
    setTimeout(() => {
      this.pullCloudState();
    }, 500);

    // Periodic sync every 10 seconds if online
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (navigator.onLine && !this.isSyncInProgress) {
          this.pullCloudState();
        }
      }, 10000);

      window.addEventListener('focus', () => {
        if (navigator.onLine) {
          this.pullCloudState();
        }
      });
    }
  }

  public subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Listener callback error:', e);
      }
    });
  }

  private getEmail() {
    return this.currentUser?.email || 'default';
  }

  private saveContacts() {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.CONTACTS, this.getEmail()), JSON.stringify(this.contacts));
  }

  private saveDeletedContacts() {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.DELETED_CONTACTS, this.getEmail()), JSON.stringify(this.deletedContactIds));
  }

  private saveTags() {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.TAGS, this.getEmail()), JSON.stringify(this.tags));
  }

  private saveTasks() {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.TASKS, this.getEmail()), JSON.stringify(this.tasks));
  }

  private saveSavedEvents() {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.SAVED_EVENTS, this.getEmail()), JSON.stringify(this.savedEvents));
  }

  private saveEventSearchConfigStorage() {
    if (this.eventSearchConfig) {
      localStorage.setItem(getStorageKey(STORAGE_KEYS.EVENT_SEARCH_CONFIG, this.getEmail()), JSON.stringify(this.eventSearchConfig));
    }
  }

  private saveEventSearchHistoryStorage() {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.EVENT_SEARCH_HISTORY, this.getEmail()), JSON.stringify(this.eventSearchHistory));
  }

  private saveInteractions() {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.INTERACTIONS, this.getEmail()), JSON.stringify(this.interactions));
  }

  private saveQueue() {
    localStorage.setItem(getStorageKey(STORAGE_KEYS.SYNC_QUEUE, this.getEmail()), JSON.stringify(this.pendingQueue));
  }

  private saveUsers() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
  }

  private saveCurrentUser() {
    if (this.currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  private addToSyncQueue(action: PendingSyncItem['action'], entityId: string, payload: any) {
    const isOnline = navigator.onLine;
    const newItem: PendingSyncItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action,
      entityId,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.pendingQueue.push(newItem);
    this.saveQueue();

    if (isOnline) {
      setTimeout(() => this.processSyncQueue(), 300);
    }
  }

  // --- PUBLIC CRM DATA METHODS ---

  public getContacts(): Contact[] {
    return [...this.contacts]
      .filter((c) => !this.deletedContactIds.includes(c.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getContactById(id: string): Contact | undefined {
    return this.contacts.find((c) => c.id === id);
  }

  public saveContact(contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'synced'> & { id?: string }): Contact {
    const isEditing = Boolean(contactData.id);
    const id = contactData.id || `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    let savedContact: Contact;

    if (isEditing) {
      const existing = this.contacts.find((c) => c.id === id);
      savedContact = {
        ...(existing || {}),
        ...contactData,
        id,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        synced: navigator.onLine,
      } as Contact;

      this.contacts = this.contacts.map((c) => (c.id === id ? savedContact : c));
      this.addToSyncQueue('UPDATE_CONTACT', id, savedContact);
    } else {
      savedContact = {
        ...contactData,
        id,
        createdAt: now,
        updatedAt: now,
        synced: navigator.onLine,
      };

      this.contacts.unshift(savedContact);
      this.addToSyncQueue('CREATE_CONTACT', id, savedContact);
    }

    // Sincroniza automaticamente a data de retorno agendada com a Agenda (Mês, Semana, Dia)
    if (savedContact.nextFollowUpDate) {
      const d = new Date(savedContact.nextFollowUpDate);
      const isValid = !isNaN(d.getTime());
      const dateStr = isValid ? toLocalDateString(d) : toLocalDateString(new Date());
      const hours = isValid ? String(d.getHours()).padStart(2, '0') : '14';
      const minutes = isValid ? String(d.getMinutes()).padStart(2, '0') : '00';
      const timeStr = `${hours}:${minutes}`;

      const existingTask = this.tasks.find((t) => t.contactId === id && !t.completed);
      if (existingTask) {
        existingTask.title = savedContact.followUpLabel || savedContact.nextActionTitle || `Retorno com ${savedContact.name}`;
        existingTask.date = dateStr;
        existingTask.time = timeStr;
        existingTask.dueDateTime = savedContact.nextFollowUpDate;
        existingTask.contactName = savedContact.name;
        existingTask.contactPhone = savedContact.phone;
        existingTask.updatedAt = now;
        this.saveTasks();
        this.addToSyncQueue('SAVE_TASK', existingTask.id, existingTask);
      } else {
        const newTask: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          contactId: id,
          contactName: savedContact.name,
          contactPhone: savedContact.phone,
          title: savedContact.followUpLabel || savedContact.nextActionTitle || `Retorno com ${savedContact.name}`,
          type: savedContact.nextActionType || 'return',
          date: dateStr,
          time: timeStr,
          dueDateTime: savedContact.nextFollowUpDate,
          notes: savedContact.nextActionNotes || `Agendamento de retorno: ${savedContact.followUpLabel || 'Follow-up'}`,
          completed: false,
          createdAt: now,
          updatedAt: now,
        };
        this.tasks.unshift(newTask);
        this.saveTasks();
        this.addToSyncQueue('SAVE_TASK', newTask.id, newTask);
      }
    }

    this.saveContacts();
    this.notifyListeners();
    return savedContact;
  }

  public updateContactStage(contactId: string, newStage: FunnelStage, reason?: string, note?: string): Contact | null {
    const contact = this.getContactById(contactId);
    if (!contact) return null;

    const previousStage = contact.stage;
    const now = new Date().toISOString();
    const updated = this.saveContact({
      ...contact,
      stage: newStage,
      lastInteractionDate: now,
    });

    const prevLabel = STAGE_CONFIG[previousStage]?.label || previousStage;
    const newLabel = STAGE_CONFIG[newStage]?.label || newStage;
    const isMovingForward = ['contato', 'prospeccao', 'proposta', 'perdido'].indexOf(newStage) > ['contato', 'prospeccao', 'proposta', 'perdido'].indexOf(previousStage);

    let summary = `Mudança de estágio: ${prevLabel} → ${newLabel}`;
    if (reason) {
      summary += ` • Motivo: ${reason}`;
    }

    this.addInteraction({
      contactId,
      type: 'stage_change',
      summary,
      notes: note || undefined,
      previousStage,
      newStage,
      stageChangeReason: reason,
      date: now,
      dealValueSnapshot: contact.dealValue,
      authorName: this.currentUser?.name || 'Consultor Comercial',
    });

    return updated;
  }

  // --- TASKS & AGENDA METHODS ---

  public getTasks(filter?: {
    contactId?: string;
    status?: 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';
    type?: TaskType;
  }): Task[] {
    let list = [...this.tasks];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Ensure contact details are populated
    const contactMap = new Map<string, Contact>(this.contacts.map((c) => [c.id, c]));
    list = list.map((task) => {
      const contact = contactMap.get(task.contactId);
      return {
        ...task,
        contactName: task.contactName || contact?.name || 'Cliente',
        contactPhone: task.contactPhone || contact?.phone || '',
      };
    });

    if (filter?.contactId) {
      list = list.filter((t) => t.contactId === filter.contactId);
    }

    if (filter?.type) {
      list = list.filter((t) => t.type === filter.type);
    }

    if (filter?.status && filter.status !== 'all') {
      if (filter.status === 'completed') {
        list = list.filter((t) => t.completed);
      } else if (filter.status === 'overdue') {
        list = list.filter((t) => !t.completed && new Date(t.dueDateTime).getTime() < now.getTime() && t.date < todayStr);
      } else if (filter.status === 'today') {
        list = list.filter((t) => !t.completed && (t.date === todayStr || (new Date(t.dueDateTime).getTime() < now.getTime() && t.date === todayStr)));
      } else if (filter.status === 'upcoming') {
        list = list.filter((t) => !t.completed && t.date > todayStr);
      }
    }

    // Sort order: Incomplete tasks first (sorted by dueDateTime ascending), completed tasks last
    return list.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime();
    });
  }

  public getTaskById(id: string): Task | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  public saveTask(taskData: Partial<Task> & { contactId?: string; title: string }): Task {
    const id = taskData.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const contact = taskData.contactId ? this.getContactById(taskData.contactId) : undefined;

    const date = taskData.date || now.split('T')[0];
    const time = taskData.time || '14:00';
    let dueDateTime = taskData.dueDateTime;
    if (!dueDateTime) {
      dueDateTime = `${date}T${time}:00.000Z`;
    }

    const existingIdx = this.tasks.findIndex((t) => t.id === id);
    const existing = existingIdx >= 0 ? this.tasks[existingIdx] : null;

    const savedTask: Task = {
      ...(existing || {}),
      ...taskData,
      id,
      contactId: taskData.contactId,
      contactName: contact?.name || taskData.contactName || 'Cliente',
      contactPhone: contact?.phone || taskData.contactPhone || '',
      title: taskData.title.trim(),
      type: taskData.type || 'follow_up',
      date,
      time,
      dueDateTime,
      notes: taskData.notes || '',
      completed: taskData.completed ?? existing?.completed ?? false,
      completedAt: taskData.completedAt ?? existing?.completedAt,
      priority: taskData.priority || 'medium',
      reason: taskData.reason || existing?.reason || '',
      company: contact?.company || taskData.company || existing?.company || '',
      dealValue: contact?.dealValue ?? taskData.dealValue ?? existing?.dealValue ?? 0,
      assignedTo: taskData.assignedTo || this.currentUser?.name,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      this.tasks[existingIdx] = savedTask;
    } else {
      this.tasks.push(savedTask);
    }

    this.saveTasks();

    // Also update contact next action fields if this task is active
    if (contact && !savedTask.completed) {
      this.saveContact({
        ...contact,
        nextFollowUpDate: savedTask.dueDateTime,
        followUpLabel: savedTask.title,
        nextActionType: savedTask.type,
        nextActionTitle: savedTask.title,
        nextActionDate: savedTask.date,
        nextActionTime: savedTask.time,
        nextActionNotes: savedTask.notes,
        nextActionCompleted: false,
      });
    }

    this.addToSyncQueue('SAVE_TASK', id, savedTask);
    this.notifyListeners();
    return savedTask;
  }

  public completeTask(taskId: string, completionNotes?: string, nextTaskData?: Partial<Task>): Task | null {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const task = this.tasks[idx];
    const now = new Date().toISOString();
    task.completed = true;
    task.completedAt = now;
    if (completionNotes) {
      task.notes = task.notes ? `${task.notes}\n[Conclusão]: ${completionNotes}` : `[Conclusão]: ${completionNotes}`;
    }
    this.tasks[idx] = task;
    this.saveTasks();

    // Log interaction of type task_completed
    const contact = this.getContactById(task.contactId);
    this.addInteraction({
      contactId: task.contactId,
      type: 'task_completed',
      summary: `Tarefa concluída: ${task.title}${completionNotes ? ` • Obs: ${completionNotes}` : ''}`,
      notes: completionNotes || task.notes,
      date: now,
      authorName: this.currentUser?.name || 'Consultor Comercial',
      taskId: task.id,
    });

    // If nextTaskData is provided, create next action immediately!
    if (nextTaskData && nextTaskData.title) {
      this.saveTask({
        ...nextTaskData,
        contactId: task.contactId,
        title: nextTaskData.title,
      });
    } else if (contact) {
      // Find any other pending tasks for this contact
      const otherPending = this.tasks.find((t) => t.contactId === contact.id && !t.completed && t.id !== taskId);
      if (otherPending) {
        this.saveContact({
          ...contact,
          nextFollowUpDate: otherPending.dueDateTime,
          followUpLabel: otherPending.title,
          nextActionType: otherPending.type,
          nextActionTitle: otherPending.title,
          nextActionDate: otherPending.date,
          nextActionTime: otherPending.time,
          nextActionNotes: otherPending.notes,
          nextActionCompleted: false,
        });
      } else {
        this.saveContact({
          ...contact,
          nextActionCompleted: true,
          followUpLabel: 'Concluído',
        });
      }
    }

    this.addToSyncQueue('SAVE_TASK', taskId, task);
    this.notifyListeners();
    return task;
  }

  public rescheduleTask(taskId: string, newDate: string, newTime: string = '14:00'): Task | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const dueDateTime = `${newDate}T${newTime}:00.000Z`;
    return this.saveTask({
      ...task,
      date: newDate,
      time: newTime,
      dueDateTime,
      completed: false,
      completedAt: undefined,
    });
  }

  public deleteTask(taskId: string): boolean {
    console.log('Attempting to delete task:', taskId);
    const task = this.getTaskById(taskId);
    const contactId = task?.contactId || taskId;
    console.log('Task found:', !!task, 'ContactId to clean:', contactId);

    // Remove task by ID or any task belonging to this contact
    const initialTasksLength = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== taskId && t.contactId !== taskId && t.id !== contactId && t.contactId !== contactId);
    this.saveTasks();
    console.log('Tasks removed:', initialTasksLength - this.tasks.length);

    // Clean up contact fields
    const contactIdsToClean = [contactId, taskId, task?.contactId].filter(Boolean) as string[];
    console.log('Contact IDs to clean:', contactIdsToClean);
    for (const cId of contactIdsToClean) {
      const contact = this.getContactById(cId);
      if (contact) {
        console.log('Cleaning contact:', contact.name);
        const remaining = this.tasks.find((t) => t.contactId === contact.id && !t.completed);
        this.saveContact({
          ...contact,
          nextFollowUpDate: remaining?.dueDateTime || undefined,
          followUpLabel: remaining?.title || undefined,
          nextActionType: remaining?.type || undefined,
          nextActionTitle: remaining?.title || undefined,
          nextActionDate: remaining?.date || undefined,
          nextActionTime: remaining?.time || undefined,
          nextActionNotes: remaining?.notes || undefined,
        });
      }
    }

    // Also check all contacts in case taskId matches contact id directly
    for (const c of this.contacts) {
      if (c.id === taskId || (task && c.id === task.contactId)) {
        console.log('Additional contact cleanup:', c.name);
        const remaining = this.tasks.find((t) => t.contactId === c.id && !t.completed);
        this.saveContact({
          ...c,
          nextFollowUpDate: remaining?.dueDateTime || undefined,
          followUpLabel: remaining?.title || undefined,
          nextActionType: remaining?.type || undefined,
          nextActionTitle: remaining?.title || undefined,
          nextActionDate: remaining?.date || undefined,
          nextActionTime: remaining?.time || undefined,
          nextActionNotes: remaining?.notes || undefined,
        });
      }
    }

    this.addToSyncQueue('DELETE_TASK', taskId, { id: taskId });
    this.notifyListeners();
    return true;
  }

  public setContactNextAction(
    contactId: string, 
    action: { title: string; type: TaskType; date: string; time?: string; notes?: string; priority?: 'high' | 'medium' | 'low' }
  ): Contact | null {
    const contact = this.getContactById(contactId);
    if (!contact) return null;

    const time = action.time || '14:00';
    const dueDateTime = `${action.date}T${time}:00.000Z`;

    // Save as scheduled task
    this.saveTask({
      contactId,
      contactName: contact.name,
      contactPhone: contact.phone,
      title: action.title,
      type: action.type,
      date: action.date,
      time,
      dueDateTime,
      notes: action.notes || '',
      priority: action.priority || 'medium',
      completed: false,
    });

    const updated = this.saveContact({
      ...contact,
      nextFollowUpDate: dueDateTime,
      followUpLabel: action.title,
      nextActionType: action.type,
      nextActionTitle: action.title,
      nextActionDate: action.date,
      nextActionTime: time,
      nextActionNotes: action.notes,
      nextActionCompleted: false,
    });

    return updated;
  }

  public logContactResponse(
    contactId: string, 
    responseType: string, 
    notes?: string, 
    nextTaskData?: Partial<Task>
  ): Interaction {
    const contact = this.getContactById(contactId);
    const now = new Date().toISOString();

    const interaction = this.addInteraction({
      contactId,
      type: 'response_logged',
      summary: `Resposta do cliente: ${responseType}${notes ? ` • ${notes}` : ''}`,
      notes: notes || undefined,
      responseType,
      date: now,
      authorName: this.currentUser?.name || 'Consultor Comercial',
    });

    if (contact) {
      this.saveContact({
        ...contact,
        lastInteractionDate: now,
      });
    }

    if (nextTaskData && nextTaskData.title) {
      this.saveTask({
        ...nextTaskData,
        contactId,
        title: nextTaskData.title,
      });
    }

    return interaction;
  }

  public getLeadIndicators(): LeadIndicators {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const activeContacts = this.contacts.filter((c) => c.stage !== 'perdido');

    // Leads parados: sem interação há mais de 3 dias
    const leadsParados = activeContacts.filter((c) => {
      if (!c.lastInteractionDate) return true;
      const lastDate = new Date(c.lastInteractionDate);
      return lastDate.getTime() < threeDaysAgo.getTime();
    }).length;

    // Retornos pendentes: tarefas com type return ou follow_up não concluídas
    const retornosPendentes = this.tasks.filter(
      (t) => !t.completed && (t.type === 'return' || t.type === 'follow_up')
    ).length;

    // Contatos realizados
    const contatosRealizados = this.interactions.filter(
      (i) => ['call', 'whatsapp', 'meeting', 'proposal', 'contact'].includes(i.type)
    ).length;

    // Respostas recebidas
    const respostasRecebidas = this.interactions.filter(
      (i) => i.type === 'response_logged' || Boolean(i.responseType)
    ).length;

    // Avanços no funil
    const avancos = this.interactions.filter(
      (i) => i.type === 'stage_change' && i.newStage && ['prospeccao', 'proposta', 'perdido'].includes(i.newStage)
    ).length;

    // Vendas / Fechamentos (leads no estágio 'perdido' que agora é Clientes)
    const vendas = this.contacts.filter((c) => c.stage === 'perdido').length;

    // Leads sem próxima ação definida
    const semProximaAcao = activeContacts.filter((c) => {
      const hasPendingTask = this.tasks.some((t) => t.contactId === c.id && !t.completed);
      return !hasPendingTask && !c.nextFollowUpDate;
    }).length;

    // Tarefas vencidas
    const tarefasVencidas = this.tasks.filter((t) => {
      if (t.completed) return false;
      const dueDate = new Date(t.dueDateTime);
      return dueDate.getTime() < now.getTime() && t.date < todayStr;
    }).length;

    // Tarefas para hoje
    const tarefasHoje = this.tasks.filter((t) => {
      if (t.completed) return false;
      return t.date === todayStr;
    }).length;

    return {
      leadsParados,
      retornosPendentes,
      contatosRealizados,
      respostasRecebidas,
      avancos,
      vendas,
      semProximaAcao,
      tarefasVencidas,
      tarefasHoje,
      totalLeads: this.contacts.length,
    };
  }

  // ================= EVENTOS COMERCIAIS & CALENDÁRIO =================

  public getEventSearchConfig(): EventSearchConfig {
    if (this.eventSearchConfig) {
      return { ...this.eventSearchConfig };
    }
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const in90DaysStr = in90Days.toISOString().split('T')[0];

    const defaultConfig: EventSearchConfig = {
      userId: this.currentUser?.id,
      cep: '',
      radiusKm: 50,
      periodShortcut: '90d',
      startDate: todayStr,
      endDate: in90DaysStr,
      categories: [
        'business',
        'real_estate',
        'agro',
        'automotive_nautical',
        'investments',
        'local_fairs',
        'tech_innovation',
        'public_networking'
      ],
      autoSearchEnabled: false,
      updatedAt: new Date().toISOString()
    };
    return defaultConfig;
  }

  public setEventSearchConfig(config: Partial<EventSearchConfig>): EventSearchConfig {
    const current = this.getEventSearchConfig();
    const updated: EventSearchConfig = {
      ...current,
      ...config,
      updatedAt: new Date().toISOString()
    };
    this.eventSearchConfig = updated;
    this.saveEventSearchConfigStorage();
    this.notifyListeners();
    return updated;
  }

  public getSavedEvents(): SavedEvent[] {
    return [...this.savedEvents];
  }

  public getSavedEventById(id: string): SavedEvent | undefined {
    return this.savedEvents.find(e => e.id === id);
  }

  public saveEventToCalendar(eventData: Omit<SavedEvent, 'id' | 'savedAt'> & { id?: string }): SavedEvent {
    const id = eventData.id || `evt-saved-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const existingIdx = this.savedEvents.findIndex(e => e.id === id || (eventData.externalEventId && e.externalEventId === eventData.externalEventId));
    
    const saved: SavedEvent = {
      ...(existingIdx >= 0 ? this.savedEvents[existingIdx] : {}),
      ...eventData,
      id,
      userId: eventData.userId || this.currentUser?.id,
      savedAt: existingIdx >= 0 ? this.savedEvents[existingIdx].savedAt : now,
      updatedAt: now,
      addedToPersonalAgenda: existingIdx >= 0 ? (this.savedEvents[existingIdx].addedToPersonalAgenda || false) : (eventData.addedToPersonalAgenda || false)
    };

    if (existingIdx >= 0) {
      this.savedEvents[existingIdx] = saved;
    } else {
      this.savedEvents.unshift(saved);
    }

    this.saveSavedEvents();
    this.addToSyncQueue('SAVE_EVENT', saved.id, saved);
    this.notifyListeners();
    return saved;
  }

  public updateSavedEvent(id: string, updates: Partial<SavedEvent>): SavedEvent | null {
    const idx = this.savedEvents.findIndex(e => e.id === id);
    if (idx === -1) return null;

    const updated: SavedEvent = {
      ...this.savedEvents[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.savedEvents[idx] = updated;
    this.saveSavedEvents();
    this.addToSyncQueue('SAVE_EVENT', id, updated);
    this.notifyListeners();
    return updated;
  }

  public removeSavedEvent(id: string): boolean {
    const prevLen = this.savedEvents.length;
    this.savedEvents = this.savedEvents.filter(e => e.id !== id);
    if (this.savedEvents.length !== prevLen) {
      this.saveSavedEvents();
      this.addToSyncQueue('DELETE_EVENT', id, { id });
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public getEventSearchHistory(): EventSearchHistory[] {
    return [...this.eventSearchHistory];
  }

  public addEventSearchHistory(entry: Omit<EventSearchHistory, 'id' | 'executedAt'>): EventSearchHistory {
    const newEntry: EventSearchHistory = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      executedAt: new Date().toISOString()
    };
    this.eventSearchHistory.unshift(newEntry);
    if (this.eventSearchHistory.length > 50) {
      this.eventSearchHistory = this.eventSearchHistory.slice(0, 50);
    }
    this.saveEventSearchHistoryStorage();
    this.notifyListeners();
    return newEntry;
  }

  public checkEventAgendaConflict(date: string, time?: string): Task[] {
    return this.tasks.filter(t => {
      if (t.completed) return false;
      if (t.date !== date) return false;
      if (time && t.time && t.time.substring(0, 2) === time.substring(0, 2)) return true;
      if (!time) return true;
      return false;
    });
  }

  public addEventToPersonalAgenda(
    eventId: string, 
    personalNotes?: string, 
    assignedTo?: string,
    targetDate?: string,
    targetTime?: string
  ): { task: Task; event: SavedEvent } | null {
    const event = this.getSavedEventById(eventId);
    if (!event) return null;

    // Check if task already exists for this event to avoid duplicates
    let existingTask = this.tasks.find(t => t.eventId === eventId && !t.completed);
    const date = targetDate || event.date;
    const time = targetTime || event.time || '09:00';
    const dueDateTime = `${date}T${time}:00.000Z`;

    if (existingTask) {
      // Update existing task
      existingTask.notes = personalNotes || existingTask.notes;
      existingTask.date = date;
      existingTask.time = time;
      existingTask.dueDateTime = dueDateTime;
      if (assignedTo) existingTask.assignedTo = assignedTo;
      this.saveTasks();
      
      event.addedToPersonalAgenda = true;
      event.personalTaskId = existingTask.id;
      this.saveSavedEvents();
      this.notifyListeners();
      return { task: existingTask, event };
    }

    const newTask: Task = {
      id: `task-evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `[Evento] ${event.title}`,
      type: 'event',
      date,
      time,
      dueDateTime,
      notes: personalNotes || event.commercialNotes || event.description || '',
      completed: false,
      priority: event.commercialScore >= 80 ? 'high' : event.commercialScore >= 60 ? 'medium' : 'low',
      assignedTo: assignedTo || this.currentUser?.name || 'Consultor Comercial',
      eventId: event.id,
      eventVenue: event.venue,
      eventCategory: event.category,
      createdAt: new Date().toISOString()
    };

    this.tasks.unshift(newTask);
    this.saveTasks();

    // Mark event as added
    event.addedToPersonalAgenda = true;
    event.personalTaskId = newTask.id;
    this.saveSavedEvents();

    this.addToSyncQueue('SAVE_TASK', newTask.id, newTask);
    this.notifyListeners();
    return { task: newTask, event };
  }

  public removeEventFromPersonalAgenda(eventId: string): boolean {
    const event = this.getSavedEventById(eventId);
    if (event) {
      event.addedToPersonalAgenda = false;
      event.personalTaskId = undefined;
      this.saveSavedEvents();
    }
    // Delete linked personal task if present
    this.tasks = this.tasks.filter(t => t.eventId !== eventId);
    this.saveTasks();
    this.notifyListeners();
    return true;
  }

  public deleteContact(id: string): boolean {
    if (!this.deletedContactIds.includes(id)) {
      this.deletedContactIds.push(id);
      this.saveDeletedContacts();
    }
    this.contacts = this.contacts.filter((c) => c.id !== id && !this.deletedContactIds.includes(c.id));
    this.interactions = this.interactions.filter((i) => i.contactId !== id);
    this.tasks = this.tasks.filter((t) => t.contactId !== id && t.id !== id);
    this.saveContacts();
    this.saveInteractions();
    this.saveTasks();
    this.addToSyncQueue('DELETE_CONTACT', id, { id });
    this.notifyListeners();
    return true;
  }

  public getTags(): Tag[] {
    return [...this.tags];
  }

  public saveTag(tagData: Omit<Tag, 'id'> & { id?: string }): Tag {
    const id = tagData.id || `tag-${Date.now()}`;
    const existingIndex = this.tags.findIndex((t) => t.id === id);
    const newTag: Tag = { id, ...tagData };

    if (existingIndex >= 0) {
      this.tags[existingIndex] = newTag;
    } else {
      this.tags.push(newTag);
    }

    this.saveTags();
    this.addToSyncQueue('CREATE_TAG', id, newTag);
    this.notifyListeners();
    return newTag;
  }

  public deleteTag(id: string): void {
    this.tags = this.tags.filter((t) => t.id !== id);
    this.contacts = this.contacts.map((c) => ({
      ...c,
      tagIds: c.tagIds.filter((tId) => tId !== id),
    }));
    this.saveTags();
    this.saveContacts();
    this.addToSyncQueue('DELETE_TAG', id, { id });
    this.notifyListeners();
  }

  public getInteractions(contactId?: string): Interaction[] {
    let list = [...this.interactions];
    if (contactId) {
      list = list.filter((i) => i.contactId === contactId);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public addInteraction(interactionData: Omit<Interaction, 'id' | 'synced'>): Interaction {
    const newInteraction: Interaction = {
      ...interactionData,
      id: `int-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      synced: navigator.onLine,
    };

    this.interactions.unshift(newInteraction);
    this.saveInteractions();

    const contact = this.getContactById(interactionData.contactId);
    if (contact) {
      this.saveContact({
        ...contact,
        lastInteractionDate: interactionData.date,
      });
    }

    this.addToSyncQueue('LOG_INTERACTION', newInteraction.id, newInteraction);
    this.notifyListeners();
    return newInteraction;
  }

  public getPendingQueue(): PendingSyncItem[] {
    return [...this.pendingQueue];
  }

  // --- CLOUD MULTI-DEVICE SYNCHRONIZATION ---

  public async pullCloudState(): Promise<boolean> {
    if (!navigator.onLine || this.isSyncInProgress) return false;

    try {
      this.isSyncInProgress = true;
      const res = await fetch('/api/sync/state');
      if (!res.ok) return false;

      const data = await res.json();
      if (data && data.success && data.data) {
        const { contacts, tags, interactions, users, tasks, savedEvents, deletedContactIds } = data.data;

        let changed = false;

        if (Array.isArray(deletedContactIds)) {
          deletedContactIds.forEach((dId: string) => {
            if (dId && !this.deletedContactIds.includes(dId)) {
              this.deletedContactIds.push(dId);
              changed = true;
            }
          });
          this.saveDeletedContacts();
        }

        if (Array.isArray(users) && users.length > 0) {
          // Merge users without losing passwords if stored locally
          const updatedUsers = [...this.users];
          users.forEach((remoteUser: User) => {
            const idx = updatedUsers.findIndex((u) => u.id === remoteUser.id || u.email.toLowerCase() === remoteUser.email.toLowerCase());
            if (idx >= 0) {
              updatedUsers[idx] = { ...updatedUsers[idx], ...remoteUser };
            } else {
              updatedUsers.push(remoteUser);
            }
          });
          this.users = updatedUsers;
          this.saveUsers();
          changed = true;
        }

        if (Array.isArray(contacts)) {
          const validContacts = contacts.filter((c: Contact) => c && !this.deletedContactIds.includes(c.id));
          this.contacts = validContacts.map((c: Contact) => ({ ...c, synced: true }));
          this.saveContacts();
          changed = true;
        }

        if (Array.isArray(tags) && tags.length > 0) {
          this.tags = sanitizeAndMigrateTags(tags);
          this.saveTags();
          changed = true;
        }

        if (Array.isArray(interactions)) {
          this.interactions = interactions
            .filter((i: Interaction) => i && !this.deletedContactIds.includes(i.contactId))
            .map((i: Interaction) => ({ ...i, synced: true }));
          this.saveInteractions();
          changed = true;
        }

        // Sincronização da Agenda e Tarefas
        if (Array.isArray(tasks)) {
          const validTasks = tasks.filter((t: Task) => t && !this.deletedContactIds.includes(t.contactId) && !this.deletedContactIds.includes(t.id));
          const remoteTaskMap = new Map(validTasks.map((t: Task) => [t.id, t]));
          const localOnly = this.tasks.filter((t) => !remoteTaskMap.has(t.id) && !this.deletedContactIds.includes(t.contactId) && !this.deletedContactIds.includes(t.id));
          this.tasks = [
            ...localOnly,
            ...validTasks.map((t: Task) => ({ ...t, synced: true }))
          ];
          this.saveTasks();
          changed = true;
        }

        // Sincronização dos Eventos Comerciais Salvos
        if (Array.isArray(savedEvents)) {
          if (savedEvents.length === 0 && this.pendingQueue.length === 0) {
            if (this.savedEvents.length > 0) {
              this.savedEvents = [];
              this.saveSavedEvents();
              changed = true;
            }
          } else if (savedEvents.length > 0) {
            const remoteEventMap = new Map(savedEvents.map((e: SavedEvent) => [e.id, e]));
            const localOnlyEvents = this.savedEvents.filter((e) => !remoteEventMap.has(e.id));
            this.savedEvents = [
              ...localOnlyEvents,
              ...savedEvents
            ];
            this.saveSavedEvents();
            changed = true;
          }
        }

        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, this.lastSyncTime);

        if (changed) {
          this.notifyListeners();
        }
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Could not pull cloud state (offline or server starting):', e);
      return false;
    } finally {
      this.isSyncInProgress = false;
    }
  }

  public async processSyncQueue(): Promise<{ success: boolean; syncedCount: number }> {
    if (!navigator.onLine) {
      return { success: false, syncedCount: 0 };
    }

    try {
      this.isSyncInProgress = true;
      const count = this.pendingQueue.length;

      // Push pending queue and current state (including tasks and savedEvents) to cloud API
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: this.pendingQueue,
          contacts: this.contacts.filter(c => !this.deletedContactIds.includes(c.id)),
          tags: this.tags,
          interactions: this.interactions.filter(i => !this.deletedContactIds.includes(i.contactId)),
          tasks: this.tasks.filter(t => !this.deletedContactIds.includes(t.contactId) && !this.deletedContactIds.includes(t.id)),
          savedEvents: this.savedEvents,
          deletedContactIds: this.deletedContactIds,
        }),
      });

      if (res.ok) {
        this.pendingQueue = [];
        this.saveQueue();

        this.contacts = this.contacts.map((c) => ({ ...c, synced: true }));
        this.interactions = this.interactions.map((i) => ({ ...i, synced: true }));
        this.tasks = this.tasks.map((t) => ({ ...t, synced: true }));
        this.saveContacts();
        this.saveInteractions();
        this.saveTasks();
        this.saveSavedEvents();

        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, this.lastSyncTime);

        this.notifyListeners();
        return { success: true, syncedCount: count };
      }

      return { success: false, syncedCount: 0 };
    } catch (err) {
      console.warn('Sync push failed, retaining in offline queue:', err);
      return { success: false, syncedCount: 0 };
    } finally {
      this.isSyncInProgress = false;
    }
  }

  public async syncAll(): Promise<{ success: boolean; syncedCount: number }> {
    const pushResult = await this.processSyncQueue();
    await this.pullCloudState();
    return pushResult;
  }

  public getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  public exportBackupJSON(): string {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      contacts: this.contacts,
      tags: this.tags,
      interactions: this.interactions,
      tasks: this.tasks,
      savedEvents: this.savedEvents,
      users: this.users.map((u) => ({ ...u, password: '' })),
    };
    return JSON.stringify(backupData, null, 2);
  }

  public importBackupJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.contacts) && Array.isArray(parsed.tags)) {
        this.contacts = parsed.contacts;
        this.tags = parsed.tags;
        this.interactions = Array.isArray(parsed.interactions) ? parsed.interactions : [];
        if (Array.isArray(parsed.tasks)) this.tasks = parsed.tasks;
        if (Array.isArray(parsed.savedEvents)) this.savedEvents = parsed.savedEvents;
        this.saveContacts();
        this.saveTags();
        this.saveInteractions();
        this.saveTasks();
        this.saveSavedEvents();
        this.addToSyncQueue('UPDATE_CONTACT', 'bulk-import', { contacts: this.contacts });
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import CRM backup:', e);
      return false;
    }
  }

  public bulkAddContacts(
    newContacts: Contact[],
    newTags: Tag[] = [],
    mode: 'merge' | 'replace' | 'skip_existing' = 'merge'
  ): { addedCount: number; updatedCount: number; skippedCount: number } {
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Merge new tags
    const existingTagMap = new Map(this.tags.map((t) => [t.id, t]));
    newTags.forEach((nt) => {
      if (!existingTagMap.has(nt.id)) {
        this.tags.push(nt);
        existingTagMap.set(nt.id, nt);
        this.addToSyncQueue('CREATE_TAG', nt.id, nt);
      }
    });
    this.saveTags();

    if (mode === 'replace') {
      this.contacts = [...newContacts];
      addedCount = newContacts.length;
      this.addToSyncQueue('UPDATE_CONTACT', 'bulk-replace-csv', { contacts: this.contacts });
    } else {
      const phoneToExistingIndex = new Map<string, number>();
      this.contacts.forEach((c, idx) => {
        const cleanPhone = (c.phone || '').replace(/\D/g, '');
        if (cleanPhone) phoneToExistingIndex.set(cleanPhone, idx);
      });

      const toAdd: Contact[] = [];

      newContacts.forEach((nc) => {
        const cleanPhone = (nc.phone || '').replace(/\D/g, '');
        const existingIdx = cleanPhone ? phoneToExistingIndex.get(cleanPhone) : undefined;

        if (existingIdx !== undefined) {
          if (mode === 'skip_existing') {
            skippedCount++;
          } else {
            // Merge / Update existing
            const existing = this.contacts[existingIdx];
            const mergedTags = Array.from(new Set([...existing.tagIds, ...nc.tagIds]));
            this.contacts[existingIdx] = {
              ...existing,
              name: nc.name || existing.name,
              company: nc.company || existing.company,
              email: nc.email || existing.email,
              role: nc.role || existing.role,
              notes: nc.notes ? `${existing.notes ? existing.notes + ' | ' : ''}${nc.notes}` : existing.notes,
              tagIds: mergedTags,
              updatedAt: new Date().toISOString(),
            };
            this.addToSyncQueue('UPDATE_CONTACT', existing.id, this.contacts[existingIdx]);
            updatedCount++;
          }
        } else {
          // New contact
          toAdd.push(nc);
          if (cleanPhone) phoneToExistingIndex.set(cleanPhone, this.contacts.length + toAdd.length - 1);
          this.addToSyncQueue('CREATE_CONTACT', nc.id, nc);
          addedCount++;
        }
      });

      this.contacts = [...toAdd, ...this.contacts];
    }

    this.saveContacts();
    this.notifyListeners();

    return { addedCount, updatedCount, skippedCount };
  }

  public async clearAllContacts(): Promise<void> {
    this.contacts = [];
    this.interactions = [];
    this.tasks = [];
    this.pendingQueue = [];
    this.saveContacts();
    this.saveInteractions();
    this.saveTasks();
    this.saveQueue();
    
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        await fetch('/api/contacts/clear-all', { method: 'POST' });
      } catch (e) {
        console.error('Error clearing cloud contacts:', e);
      }
    }
    
    this.notifyListeners();
  }

  public resetToDefaultDemo(): void {
    this.contacts = [];
    this.tags = DEFAULT_TAGS;
    this.interactions = [];
    this.tasks = [];
    this.pendingQueue = [];
    this.saveContacts();
    this.saveTags();
    this.saveInteractions();
    this.saveTasks();
    this.saveQueue();
    if (typeof window !== 'undefined' && navigator.onLine) {
      fetch('/api/contacts/clear-all', { method: 'POST' }).catch(() => {});
    }
    this.notifyListeners();
  }

  // ================= AUTH & USER METHODS =================

  public getCurrentUser(): User | null {
    if (!this.currentUser) {
      const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (raw) {
        try {
          this.currentUser = JSON.parse(raw);
        } catch (e) {
          this.currentUser = null;
        }
      }
    }
    return this.currentUser;
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public async login(identifier: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Por favor, informe o e-mail ou usuário e a senha.' };
    }

    // 1. Attempt Cloud Server Login first if online
    if (navigator.onLine) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanId, password: cleanPass }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            const authenticatedUser: User = {
              ...result.user,
              password: cleanPass, // Cache locally for offline logins
              lastLoginAt: new Date().toISOString(),
            };

            this.currentUser = authenticatedUser;
            this.loadUserData(authenticatedUser.email); // ADDED
            const idx = this.users.findIndex((u) => u.id === authenticatedUser.id || u.email.toLowerCase() === cleanId);
            if (idx >= 0) {
              this.users[idx] = authenticatedUser;
            } else {
              this.users.push(authenticatedUser);
            }

            this.saveUsers();
            this.saveCurrentUser();

            // Pull latest cloud CRM contacts and pipeline immediately
            await this.pullCloudState();

            return { success: true, user: authenticatedUser };
          }
        } else if (response.status === 401) {
          return { success: false, error: 'Credenciais incorretas. Verifique seu e-mail e senha.' };
        }
      } catch (err) {
        console.warn('Server authentication unreachable, verifying locally:', err);
      }
    }

    // 2. Fallback to Local Offline Authentication
    const foundUser = this.users.find(
      (u) =>
        (u.email.toLowerCase() === cleanId ||
          u.name.toLowerCase() === cleanId ||
          u.email.toLowerCase().split('@')[0] === cleanId) &&
        (u.password === cleanPass || (!u.password && cleanPass === '123456'))
    );

    if (!foundUser) {
      return {
        success: false,
        error: 'Credenciais incorretas ou dispositivo offline sem conta em cache.',
      };
    }

    const updatedUser: User = {
      ...foundUser,
      lastLoginAt: new Date().toISOString(),
    };

    this.currentUser = updatedUser;
    this.loadUserData(updatedUser.email); // ADDED
    this.users = this.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    this.saveUsers();
    this.saveCurrentUser();

    return { success: true, user: updatedUser };
  }

  public async register(userData: {
    name: string;
    email: string;
    password: string;
    company?: string;
    role?: string;
    phone?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanName = userData.name.trim();
    const cleanPass = userData.password.trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      return { success: false, error: 'Nome, e-mail e senha são campos obrigatórios.' };
    }

    if (cleanPass.length < 4) {
      return { success: false, error: 'A senha deve conter no mínimo 4 caracteres.' };
    }

    // 1. Attempt Cloud Server Registration if online
    if (navigator.onLine) {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password: cleanPass,
            company: userData.company,
            role: userData.role,
            phone: userData.phone,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            const newUser: User = {
              ...result.user,
              password: cleanPass,
              lastLoginAt: new Date().toISOString(),
            };

            this.users.push(newUser);
            this.currentUser = newUser;
            this.loadUserData(newUser.email); // ADDED
            // Clean slate for new user account
            this.contacts = [];
            this.interactions = [];
            this.pendingQueue = [];
            this.saveContacts();
            this.saveInteractions();
            this.saveQueue();
            this.saveUsers();
            this.saveCurrentUser();

            // Pull cloud state (tags, users)
            await this.pullCloudState();

            this.notifyListeners();
            return { success: true, user: newUser };
          }
        } else if (response.status === 409) {
          return { success: false, error: 'Este e-mail já está cadastrado no sistema central.' };
        }
      } catch (e) {
        console.warn('Server registration unreachable, storing locally:', e);
      }
    }

    // 2. Offline / Local Registration
    const existing = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' };
    }

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      company: userData.company?.trim() || 'Minha Empresa',
      role: userData.role?.trim() || 'Consultor Comercial',
      phone: userData.phone?.trim() || '',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.currentUser = newUser;
    // Clean slate for new user account
    this.contacts = [];
    this.interactions = [];
    this.pendingQueue = [];
    this.saveContacts();
    this.saveInteractions();
    this.saveQueue();
    this.saveUsers();
    this.saveCurrentUser();
    this.notifyListeners();

    return { success: true, user: newUser };
  }

  public logout(): void {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.notifyListeners();
  }

  public async updateCurrentUser(updatedData: Partial<User>): Promise<User | null> {
    if (!this.currentUser) return null;

    const updatedUser: User = {
      ...this.currentUser,
      ...updatedData,
    };

    this.currentUser = updatedUser;
    this.users = this.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    this.saveUsers();
    this.saveCurrentUser();

    if (navigator.onLine) {
      try {
        await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: updatedUser.id,
            name: updatedUser.name,
            company: updatedUser.company,
            role: updatedUser.role,
            phone: updatedUser.phone,
            avatarUrl: updatedUser.avatarUrl,
          }),
        });
      } catch (e) {
        console.warn('Could not sync user profile to cloud immediately:', e);
      }
    }

    this.notifyListeners();
    return this.currentUser;
  }

  public async changePassword(userId: string, currentPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    const userIndex = this.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const user = this.users[userIndex];
    if (user.password && user.password !== currentPass.trim()) {
      return { success: false, error: 'Senha atual incorreta.' };
    }

    if (newPass.trim().length < 4) {
      return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    if (navigator.onLine) {
      try {
        const res = await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            currentPassword: currentPass.trim(),
            newPassword: newPass.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          return { success: false, error: errData.error || 'Erro ao atualizar senha no servidor.' };
        }
      } catch (e) {
        console.warn('Could not update password on server, saving locally:', e);
      }
    }

    const updatedUser = { ...user, password: newPass.trim() };
    this.users[userIndex] = updatedUser;
    if (this.currentUser?.id === userId) {
      this.currentUser = updatedUser;
      this.saveCurrentUser();
    }
    this.saveUsers();
    this.notifyListeners();

    return { success: true };
  }

  public resetPasswordByEmail(email: string, newPass: string = 'senha123'): { success: boolean; error?: string; message?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const userIndex = this.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return { success: false, error: 'Nenhum usuário cadastrado com este e-mail.' };
    }

    this.users[userIndex].password = newPass;
    this.saveUsers();

    return {
      success: true,
      message: `Senha redefinida com sucesso para "${newPass}". Você já pode acessar sua conta em qualquer dispositivo.`,
    };
  }

  public getRememberedEmail(): string {
    return localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL) || '';
  }

  public setRememberedEmail(email: string, remember: boolean): void {
    if (remember && email.trim()) {
      localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, email.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    }
  }
}

export const storageService = new StorageService();
