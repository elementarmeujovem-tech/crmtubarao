import React, { useState, useEffect, useCallback } from 'react';
import { 
  Contact, 
  Tag, 
  Interaction, 
  SyncState, 
  FunnelStage,
  User,
  Task,
  TaskType
} from './types';
import { storageService } from './services/storage';

import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { FunnelView } from './components/FunnelView';
import { ContactsView } from './components/ContactsView';
import { DashboardView } from './components/DashboardView';
import { AgendaView } from './components/AgendaView';
import { StageMovementModal } from './components/StageMovementModal';
import { QuickResponseModal } from './components/QuickResponseModal';
import { ContactDetailModal } from './components/ContactDetailModal';
import { ContactModal } from './components/ContactModal';
import { TagsManagerModal } from './components/TagsManagerModal';
import { SyncSettingsModal } from './components/SyncSettingsModal';
import { ApkInstallGuideModal } from './components/ApkInstallGuideModal';
import { LoginView } from './components/LoginView';
import { UserProfileModal } from './components/UserProfileModal';
import { CsvImportModal } from './components/CsvImportModal';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { EditDealValueModal } from './components/EditDealValueModal';
import { exportContactsToCsv } from './utils/csvParser';
import { toLocalDateString } from './utils/calendarSync';

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => storageService.getCurrentUser());

  // App Core State
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: storageService.getLastSyncTime(),
    pendingCount: 0,
    serverConnected: true,
  });

  // Modals state
  const [selectedDetailContact, setSelectedDetailContact] = useState<Contact | null>(null);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);
  const [isClearConfirmModalOpen, setIsClearConfirmModalOpen] = useState(false);
  const [movementModalData, setMovementModalData] = useState<{ contact: Contact; targetStage: FunnelStage } | null>(null);
  const [quickResponseContact, setQuickResponseContact] = useState<Contact | null>(null);
  const [editingDealValueContact, setEditingDealValueContact] = useState<Contact | null>(null);

  // Refresh all state from storage
  const refreshData = useCallback(() => {
    setContacts(storageService.getContacts());
    setTags(storageService.getTags());
    setInteractions(storageService.getInteractions());
    setTasks(storageService.getTasks());
    setCurrentUser(storageService.getCurrentUser());
    setSyncState((prev) => ({
      ...prev,
      lastSyncTime: storageService.getLastSyncTime(),
      pendingCount: storageService.getPendingQueue().length,
    }));
  }, []);

  // Initialize data on mount & set network listeners
  useEffect(() => {
    refreshData();

    // Subscribe to multi-device sync updates
    const unsubscribe = storageService.subscribe(() => {
      refreshData();
    });

    const handleOnline = async () => {
      setSyncState((prev) => ({ ...prev, isOnline: true, isSyncing: true }));
      await storageService.processSyncQueue();
      await storageService.pullCloudState();
      setSyncState((prev) => ({ ...prev, isSyncing: false }));
      refreshData();
    };

    const handleOffline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshData]);

  // Dark Mode side effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    refreshData();
  };

  const handleLogout = () => {
    storageService.logout();
    setCurrentUser(null);
  };

  const handleUpdateCurrentUser = (updated: User) => {
    setCurrentUser(updated);
    refreshData();
  };

  // Handlers
  const handleOpenEditContactModal = (contact: Contact) => {
    setContactToEdit(contact);
    setIsContactModalOpen(true);
  };

  const handleOpenEditDealValue = (c: Contact) => {
    setEditingDealValueContact(c);
  };

  const handleSaveDealValue = (updated: Contact) => {
    const saved = storageService.saveContact(updated);
    refreshData();
    if (selectedDetailContact && saved && selectedDetailContact.id === saved.id) {
      setSelectedDetailContact(saved);
    }
    setEditingDealValueContact(null);
  };

  const handleSaveContact = (contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'synced'> & { id?: string }) => {
    const saved = storageService.saveContact(contactData);
    refreshData();
    setIsContactModalOpen(false);
    setContactToEdit(null);
    if (selectedDetailContact && saved && selectedDetailContact.id === saved.id) {
      setSelectedDetailContact(saved);
    }
  };

  const handleDeleteContact = (id: string) => {
    storageService.deleteContact(id);
    refreshData();
    if (selectedDetailContact?.id === id) {
      setSelectedDetailContact(null);
    }
  };

  const handleUpdateStage = (contactId: string, newStage: FunnelStage) => {
    storageService.updateContactStage(contactId, newStage);
    refreshData();
    // Keep detail contact synchronized
    if (selectedDetailContact?.id === contactId) {
      const updated = storageService.getContactById(contactId);
      if (updated) setSelectedDetailContact(updated);
    }
  };

  const handleAddInteraction = (interactionData: Omit<Interaction, 'id' | 'synced'>) => {
    storageService.addInteraction(interactionData);
    refreshData();
  };

  const handleSaveTag = (tagData: Omit<Tag, 'id'> & { id?: string }) => {
    storageService.saveTag(tagData);
    refreshData();
  };

  const handleDeleteTag = (id: string) => {
    storageService.deleteTag(id);
    refreshData();
  };

  const handleManualSync = async () => {
    setSyncState((prev) => ({ ...prev, isSyncing: true }));
    await storageService.syncAll();
    setSyncState((prev) => ({ ...prev, isSyncing: false }));
    refreshData();
  };

  const handleExportBackup = () => {
    const jsonStr = storageService.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_flow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonStr: string): boolean => {
    const ok = storageService.importBackupJSON(jsonStr);
    if (ok) refreshData();
    return ok;
  };

  const handleResetDemoData = () => {
    storageService.resetToDefaultDemo();
    refreshData();
  };

  const handleQuickAddContact = (
    name: string,
    phone: string,
    dealValue: number,
    stage: FunnelStage,
    tagIds?: string[]
  ) => {
    storageService.saveContact({
      name,
      phone: phone || '(00) 00000-0000',
      email: '',
      company: '',
      role: 'Cliente',
      lastInteractionDate: new Date().toISOString(),
      notes: 'Cadastrado rapidamente pelo painel de soma',
      dealValue,
      stage,
      tagIds: tagIds || [],
    });
    refreshData();
  };

  const handleCreateTag = (name: string, bgHex?: string, textHex?: string): Tag => {
    const newTag = storageService.saveTag({
      name,
      color: 'indigo',
      bgHex: bgHex || '#3b82f6',
      textHex: textHex || '#ffffff',
      description: 'Etiqueta criada rapidamente',
    });
    refreshData();
    return newTag;
  };

  const handleToggleContactTag = (contactId: string, tagId: string) => {
    const contact = storageService.getContactById(contactId);
    if (!contact) return;
    const hasTag = contact.tagIds.includes(tagId);
    const updatedTagIds = hasTag
      ? contact.tagIds.filter((t) => t !== tagId)
      : [...contact.tagIds, tagId];

    storageService.saveContact({
      ...contact,
      tagIds: updatedTagIds,
    });
    refreshData();
  };

  const handleClearAllContacts = () => {
    setIsClearConfirmModalOpen(true);
  };

  const handleExecuteClearAll = async () => {
    await storageService.clearAllContacts();
    refreshData();
  };

  const handleUpdateFollowUp = (contactId: string, followUpLabel: string, nextFollowUpDate: string, notes?: string) => {
    const contact = storageService.getContactById(contactId);
    if (!contact) return;
    storageService.saveContact({
      ...contact,
      followUpLabel,
      nextFollowUpDate,
      lastInteractionDate: new Date().toISOString(),
    });

    if (nextFollowUpDate) {
      const d = new Date(nextFollowUpDate);
      if (!isNaN(d.getTime())) {
        const dateStr = toLocalDateString(d);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        storageService.saveTask({
          contactId,
          contactName: contact.name,
          contactPhone: contact.phone,
          company: contact.company,
          dealValue: contact.dealValue,
          title: `${followUpLabel} - ${contact.name}`,
          reason: followUpLabel,
          type: 'follow_up',
          date: dateStr,
          time: timeStr,
          dueDateTime: nextFollowUpDate,
          notes: notes || undefined,
          priority: 'high',
        });
      }
    }

    refreshData();
  };

  const handleSaveTask = (taskData: Partial<Task> & { contactId?: string; title: string }) => {
    storageService.saveTask(taskData as any);
    refreshData();
  };

  const handleCompleteTask = (taskId: string, notes?: string, nextTask?: Partial<Task>) => {
    storageService.completeTask(taskId, notes, nextTask);
    refreshData();
  };

  const handleRescheduleTask = (taskId: string, newDate: string, newTime?: string) => {
    storageService.rescheduleTask(taskId, newDate, newTime);
    refreshData();
  };

  const handleDeleteTask = (taskId: string) => {
    storageService.deleteTask(taskId);
    refreshData();
  };

  const handleOpenStageMovement = (contact: Contact, targetStage: FunnelStage) => {
    setMovementModalData({ contact, targetStage });
  };

  const handleConfirmStageMovement = (data: {
    newStage: FunnelStage;
    reason: string;
    notes?: string;
    nextAction?: {
      title: string;
      type: TaskType;
      date: string;
      time: string;
      notes?: string;
    };
  }) => {
    if (!movementModalData) return;
    const contactId = movementModalData.contact.id;
    storageService.updateContactStage(contactId, data.newStage, data.reason, data.notes);
    if (data.nextAction && data.nextAction.title && data.nextAction.date) {
      storageService.saveTask({
        contactId,
        contactName: movementModalData.contact.name,
        contactPhone: movementModalData.contact.phone,
        company: movementModalData.contact.company,
        dealValue: movementModalData.contact.dealValue,
        title: data.nextAction.title,
        reason: data.reason,
        type: data.nextAction.type,
        date: data.nextAction.date,
        time: data.nextAction.time || '10:00',
        dueDateTime: `${data.nextAction.date}T${data.nextAction.time || '10:00'}:00.000Z`,
        notes: data.nextAction.notes,
        priority: 'high',
      });
    }
    setMovementModalData(null);
    refreshData();
    if (selectedDetailContact?.id === contactId) {
      const updated = storageService.getContactById(contactId);
      if (updated) setSelectedDetailContact(updated);
    }
  };

  const handleOpenQuickResponse = (contact: Contact) => {
    setQuickResponseContact(contact);
  };

  const handleSaveQuickResponse = (data: {
    responseType: string;
    notes?: string;
    nextAction?: {
      title: string;
      type: TaskType;
      date: string;
      time: string;
      notes?: string;
    };
  }) => {
    if (!quickResponseContact) return;
    const contactId = quickResponseContact.id;
    const nextTask = data.nextAction
      ? {
          title: data.nextAction.title,
          type: data.nextAction.type,
          date: data.nextAction.date,
          time: data.nextAction.time,
          dueDateTime: `${data.nextAction.date}T${data.nextAction.time || '14:00'}:00.000Z`,
          notes: data.nextAction.notes,
          priority: 'high' as const,
        }
      : undefined;

    storageService.logContactResponse(contactId, data.responseType, data.notes, nextTask);
    setQuickResponseContact(null);
    refreshData();
    if (selectedDetailContact?.id === contactId) {
      const updated = storageService.getContactById(contactId);
      if (updated) setSelectedDetailContact(updated);
    }
  };

  const handleCsvImportSuccess = (
    newContacts: Contact[],
    newTags: Tag[],
    mode: 'merge' | 'replace' | 'skip_existing'
  ) => {
    const res = storageService.bulkAddContacts(newContacts, newTags, mode);
    refreshData();
    return res;
  };

  const handleExportCsv = () => {
    const csvContent = exportContactsToCsv(contacts, tags);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contatos_crm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Contagem de leads pendentes de 1ª abordagem na Zona de Guerra
  const pendingWarZoneCount = React.useMemo(() => {
    const approachedSet = new Set(
      interactions
        .filter((i) => ['call', 'whatsapp', 'email', 'meeting', 'response_logged', 'first_approach', 'proposal'].includes(i.type))
        .map((i) => i.contactId)
    );
    return contacts.filter((c) => {
      if (c.firstApproachAt) return false;
      if (c.stage === 'perdido') return false;
      return !approachedSet.has(c.id);
    }).length;
  }, [contacts, interactions]);

  // If user is not logged in, render the Login View
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors selection:bg-indigo-500 selection:text-white w-full max-w-full overflow-x-clip relative flex flex-col">
      {/* Top Fixed Header */}
      <Header
        syncState={syncState}
        darkMode={darkMode}
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenNewContactModal={() => {
          setContactToEdit(null);
          setIsContactModalOpen(true);
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        onOpenUserProfileModal={() => setIsUserProfileModalOpen(true)}
        onLogout={handleLogout}
        onManualSync={handleManualSync}
      />

      {/* Main Container View Area */}
      <main 
        className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 pt-16 sm:pt-20 flex-1 overflow-x-clip"
        style={{
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 5rem), 6rem)',
        }}
      >
        {/* DASHBOARD: Visão Geral e Indicadores de Desempenho */}
        {activeTab === 'dashboard' && (
          <DashboardView
            contacts={contacts}
            tags={tags}
            interactions={interactions}
            tasks={tasks}
            onSelectContact={(contact) => setSelectedDetailContact(contact)}
            onEditContact={handleOpenEditContactModal}
            onNavigateToFunnel={() => setActiveTab('frio')}
            onNavigateToAgenda={() => setActiveTab('agenda')}
            onNavigateToWarZone={() => setActiveTab('contacts')}
          />
        )}

        {/* AGENDA & CENTRAL DE TAREFAS: Visão Diária, Semanal, Mensal e Ações */}
        {activeTab === 'agenda' && (
          <AgendaView
            contacts={contacts}
            tags={tags}
            tasks={tasks}
            onSelectContact={(contact) => setSelectedDetailContact(contact)}
            onEditContact={handleOpenEditContactModal}
            onSaveTask={handleSaveTask}
            onCompleteTask={handleCompleteTask}
            onRescheduleTask={handleRescheduleTask}
            onOpenStageMovement={handleOpenStageMovement}
            onOpenQuickResponse={handleOpenQuickResponse}
            onOpenNewContactModal={() => {
              setContactToEdit(null);
              setIsContactModalOpen(true);
            }}
            onEditDealValue={handleOpenEditDealValue}
            onUpdateFollowUp={handleUpdateFollowUp}
            onDeleteTask={handleDeleteTask}
            onNavigateToWarZone={() => setActiveTab('contacts')}
          />
        )}

        {/* ZONA DE GUERRA: Central de Entrada e Direcionamento de Leads Novos */}
        {activeTab === 'contacts' && (
          <ContactsView
            contacts={contacts}
            tags={tags}
            interactions={interactions}
            tasks={tasks}
            onSelectContact={(contact) => setSelectedDetailContact(contact)}
            onEditContact={handleOpenEditContactModal}
            onOpenNewContactModal={() => {
              setContactToEdit(null);
              setIsContactModalOpen(true);
            }}
            onManageTags={() => setIsTagsModalOpen(true)}
            onOpenCsvImport={() => setIsCsvImportModalOpen(true)}
            onExportCsv={handleExportCsv}
            onClearAllContacts={handleClearAllContacts}
            onUpdateStage={handleUpdateStage}
            onOpenStageMovement={handleOpenStageMovement}
            onOpenQuickResponse={handleOpenQuickResponse}
            onToggleContactTag={handleToggleContactTag}
            onCreateTag={handleCreateTag}
            onUpdateFollowUp={handleUpdateFollowUp}
            onEditDealValue={handleOpenEditDealValue}
            onAddInteraction={handleAddInteraction}
            onSaveTask={handleSaveTask}
          />
        )}

        {/* FRIO: Aba Frio */}
        {activeTab === 'frio' && (
          <FunnelView
            contacts={contacts}
            tags={tags}
            initialStageFilter="contato"
            onSelectContact={(contact) => setSelectedDetailContact(contact)}
            onEditContact={handleOpenEditContactModal}
            onUpdateStage={handleUpdateStage}
            onOpenStageMovement={handleOpenStageMovement}
            onOpenQuickResponse={handleOpenQuickResponse}
            onOpenNewContactModal={() => {
              setContactToEdit(null);
              setIsContactModalOpen(true);
            }}
            onQuickAddContact={handleQuickAddContact}
            onCreateTag={handleCreateTag}
            onToggleContactTag={handleToggleContactTag}
            onUpdateFollowUp={handleUpdateFollowUp}
            onManageTags={() => setIsTagsModalOpen(true)}
            onEditDealValue={handleOpenEditDealValue}
          />
        )}

        {/* VIVO: Aba Vivo */}
        {activeTab === 'vivo' && (
          <FunnelView
            contacts={contacts}
            tags={tags}
            initialStageFilter="prospeccao"
            onSelectContact={(contact) => setSelectedDetailContact(contact)}
            onEditContact={handleOpenEditContactModal}
            onUpdateStage={handleUpdateStage}
            onOpenStageMovement={handleOpenStageMovement}
            onOpenQuickResponse={handleOpenQuickResponse}
            onOpenNewContactModal={() => {
              setContactToEdit(null);
              setIsContactModalOpen(true);
            }}
            onQuickAddContact={handleQuickAddContact}
            onCreateTag={handleCreateTag}
            onToggleContactTag={handleToggleContactTag}
            onUpdateFollowUp={handleUpdateFollowUp}
            onManageTags={() => setIsTagsModalOpen(true)}
            onEditDealValue={handleOpenEditDealValue}
          />
        )}

        {/* QUENTE: Aba Quente */}
        {activeTab === 'quente' && (
          <FunnelView
            contacts={contacts}
            tags={tags}
            initialStageFilter="proposta"
            onSelectContact={(contact) => setSelectedDetailContact(contact)}
            onEditContact={handleOpenEditContactModal}
            onUpdateStage={handleUpdateStage}
            onOpenStageMovement={handleOpenStageMovement}
            onOpenQuickResponse={handleOpenQuickResponse}
            onOpenNewContactModal={() => {
              setContactToEdit(null);
              setIsContactModalOpen(true);
            }}
            onQuickAddContact={handleQuickAddContact}
            onCreateTag={handleCreateTag}
            onToggleContactTag={handleToggleContactTag}
            onUpdateFollowUp={handleUpdateFollowUp}
            onManageTags={() => setIsTagsModalOpen(true)}
            onEditDealValue={handleOpenEditDealValue}
          />
        )}

        {/* CLIENTES: Aba Clientes (Leads Convertidos / Ganhos - no lugar de Morto) */}
        {(activeTab === 'clientes' || activeTab === 'morto') && (
          <FunnelView
            contacts={contacts}
            tags={tags}
            initialStageFilter="perdido"
            onSelectContact={(contact) => setSelectedDetailContact(contact)}
            onEditContact={handleOpenEditContactModal}
            onUpdateStage={handleUpdateStage}
            onOpenStageMovement={handleOpenStageMovement}
            onOpenQuickResponse={handleOpenQuickResponse}
            onOpenNewContactModal={() => {
              setContactToEdit(null);
              setIsContactModalOpen(true);
            }}
            onQuickAddContact={handleQuickAddContact}
            onCreateTag={handleCreateTag}
            onToggleContactTag={handleToggleContactTag}
            onUpdateFollowUp={handleUpdateFollowUp}
            onManageTags={() => setIsTagsModalOpen(true)}
            onEditDealValue={handleOpenEditDealValue}
          />
        )}
      </main>

      {/* Bottom Floating Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        contactCount={contacts.length}
        pendingTaskCount={tasks.filter((t) => !t.completed && t.date === toLocalDateString(new Date())).length}
        overdueTaskCount={tasks.filter((t) => !t.completed && t.date < toLocalDateString(new Date())).length}
        pendingWarZoneCount={pendingWarZoneCount}
      />

      {/* Detail Modal Drawer */}
      {selectedDetailContact && (
        <ContactDetailModal
          contact={selectedDetailContact}
          tags={tags}
          interactions={interactions}
          onClose={() => setSelectedDetailContact(null)}
          onEditContact={(contact) => {
            setSelectedDetailContact(null);
            setContactToEdit(contact);
            setIsContactModalOpen(true);
          }}
          onDeleteContact={handleDeleteContact}
          onAddInteraction={handleAddInteraction}
          onUpdateStage={handleUpdateStage}
          onOpenStageMovement={handleOpenStageMovement}
          onOpenQuickResponse={handleOpenQuickResponse}
          onEditDealValue={handleOpenEditDealValue}
        />
      )}

      {/* New/Edit Contact Modal */}
      {isContactModalOpen && (
        <ContactModal
          contactToEdit={contactToEdit}
          tags={tags}
          onClose={() => {
            setIsContactModalOpen(false);
            setContactToEdit(null);
          }}
          onSave={handleSaveContact}
        />
      )}

      {/* Tags Manager Modal */}
      {isTagsModalOpen && (
        <TagsManagerModal
          tags={tags}
          contacts={contacts}
          onClose={() => setIsTagsModalOpen(false)}
          onSaveTag={handleSaveTag}
          onDeleteTag={handleDeleteTag}
        />
      )}

      {/* Sync Settings Modal */}
      {isSyncModalOpen && (
        <SyncSettingsModal
          syncState={syncState}
          pendingQueue={storageService.getPendingQueue()}
          onClose={() => setIsSyncModalOpen(false)}
          onManualSync={handleManualSync}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onResetDemoData={handleResetDemoData}
          onClearAllContacts={handleClearAllContacts}
        />
      )}

      {/* User Profile & Account Settings Modal */}
      {isUserProfileModalOpen && currentUser && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setIsUserProfileModalOpen(false)}
          onUpdateUser={handleUpdateCurrentUser}
          onLogout={handleLogout}
        />
      )}

      {/* APK / PWA Guide Modal */}
      {isApkModalOpen && (
        <ApkInstallGuideModal onClose={() => setIsApkModalOpen(false)} />
      )}

      {/* CSV Import Modal with Specific Columns */}
      {isCsvImportModalOpen && (
        <CsvImportModal
          isOpen={isCsvImportModalOpen}
          onClose={() => setIsCsvImportModalOpen(false)}
          existingContacts={contacts}
          existingTags={tags}
          onImportSuccess={handleCsvImportSuccess}
        />
      )}

      {/* Clear All Contacts Confirmation Modal */}
      {isClearConfirmModalOpen && (
        <ClearConfirmModal
          isOpen={isClearConfirmModalOpen}
          totalContacts={contacts.length}
          onClose={() => setIsClearConfirmModalOpen(false)}
          onConfirm={handleExecuteClearAll}
        />
      )}

      {/* Stage Movement Intelligent Modal */}
      {movementModalData && (
        <StageMovementModal
          contact={movementModalData.contact}
          targetStage={movementModalData.targetStage}
          onClose={() => setMovementModalData(null)}
          onConfirm={handleConfirmStageMovement}
        />
      )}

      {/* Quick Response Modal */}
      {quickResponseContact && (
        <QuickResponseModal
          contact={quickResponseContact}
          onClose={() => setQuickResponseContact(null)}
          onSave={handleSaveQuickResponse}
        />
      )}

      {/* Edit Estimated Deal Value Modal (opened by clicking on deal value anywhere) */}
      <EditDealValueModal
        contact={editingDealValueContact}
        isOpen={Boolean(editingDealValueContact)}
        onClose={() => setEditingDealValueContact(null)}
        onSave={handleSaveDealValue}
      />
    </div>
  );
}
