import React, { useState, useEffect } from 'react';
import { 
  Contact, 
  Tag, 
  FunnelStage, 
  STAGE_CONFIG 
} from '../types';
import { getWhatsAppUrl } from '../utils/whatsapp';
import { toLocalDateString } from '../utils/calendarSync';
import { storageService } from '../services/storage';
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  MessageSquare, 
  PhoneCall, 
  Mail,
  Building2, 
  Search,
  X,
  Tag as TagIcon,
  Calendar,
  Sparkles,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Filter,
  ArrowRightLeft,
  Clock,
  UserCheck,
  Flame,
  Zap,
  Snowflake,
  Edit3,
  AlertTriangle
} from 'lucide-react';

interface FunnelViewProps {
  contacts: Contact[];
  tags: Tag[];
  initialStageFilter?: 'all' | FunnelStage;
  onSelectContact: (contact: Contact) => void;
  onEditContact?: (contact: Contact) => void;
  onUpdateStage: (contactId: string, newStage: FunnelStage) => void;
  onOpenStageMovement?: (contact: Contact, targetStage: FunnelStage) => void;
  onOpenQuickResponse?: (contact: Contact) => void;
  onOpenNewContactModal: () => void;
  onQuickAddContact?: (name: string, phone: string, dealValue: number, stage: FunnelStage, tagIds?: string[]) => void;
  onCreateTag?: (name: string, bgHex?: string, textHex?: string) => Tag;
  onToggleContactTag?: (contactId: string, tagId: string) => void;
  onUpdateFollowUp?: (contactId: string, followUpLabel: string, nextFollowUpDate: string) => void;
  onManageTags?: () => void;
  onEditDealValue?: (contact: Contact) => void;
}

const STAGES: FunnelStage[] = [
  'contato',
  'prospeccao',
  'proposta',
  'perdido',
];

const PRESET_COLORS = [
  { name: 'Azul / Frio', bgHex: '#0284c7', textHex: '#ffffff' },
  { name: 'Indigo / Vivo', bgHex: '#2563eb', textHex: '#ffffff' },
  { name: 'Laranja / Quente', bgHex: '#ea580c', textHex: '#ffffff' },
  { name: 'Verde / Clientes', bgHex: '#059669', textHex: '#ffffff' },
  { name: 'Rosa / Destaque', bgHex: '#e11d48', textHex: '#ffffff' },
  { name: 'Roxo / Follow Up', bgHex: '#7c3aed', textHex: '#ffffff' },
];

export const FunnelView: React.FC<FunnelViewProps> = ({
  contacts,
  tags,
  initialStageFilter = 'all',
  onSelectContact,
  onEditContact,
  onUpdateStage,
  onOpenStageMovement,
  onOpenQuickResponse,
  onOpenNewContactModal,
  onQuickAddContact,
  onCreateTag,
  onToggleContactTag,
  onUpdateFollowUp,
  onManageTags,
  onEditDealValue,
}) => {
  // Mobile / Stage Filter State
  const [stageFilter, setStageFilter] = useState<'all' | FunnelStage>(initialStageFilter);

  useEffect(() => {
    if (initialStageFilter) {
      setStageFilter(initialStageFilter);
    }
  }, [initialStageFilter]);

  // Drag & drop state
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<FunnelStage | null>(null);

  // Column search filters
  const [columnSearch, setColumnSearch] = useState<Record<FunnelStage, string>>({
    contato: '',
    prospeccao: '',
    proposta: '',
    perdido: '',
  });

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');

  // Follow-Up Modal State
  const [editingFollowUpContact, setEditingFollowUpContact] = useState<Contact | null>(null);
  const [followUpLabelInput, setFollowUpLabelInput] = useState<string>('2º Contato');
  const [followUpDateInput, setFollowUpDateInput] = useState<string>('');
  const [followUpTimeInput, setFollowUpTimeInput] = useState<string>('14:00');

  // Inline Quick Client Insert Drawer State
  const [isQuickInsertOpen, setIsQuickInsertOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickValue, setQuickValue] = useState('');
  const [quickStage, setQuickStage] = useState<FunnelStage>('contato');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Quick Create Tag Inline State
  const [isCreatingTagInline, setIsCreatingTagInline] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColorIdx, setNewTagColorIdx] = useState(0);

  // Active Tag filter
  const [selectedFilterTagId, setSelectedFilterTagId] = useState<string | null>(null);

  // Active Tag Menu Popover for card
  const [activeTagMenuContactId, setActiveTagMenuContactId] = useState<string | null>(null);
  const [inlineTagName, setInlineTagName] = useState('');

  const tagMap = new Map<string, Tag>(tags.map((t) => [t.id, t]));

  const formatFollowUpDisplay = (isoStr?: string) => {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    const weekDay = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const dayMonth = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${weekDay} - ${dayMonth} - ${time}`;
  };

  // Helper to determine scheduling status for cards
  const getScheduleStatus = (dateStr?: string) => {
    if (!dateStr) return { status: 'none', label: 'Não Agendado', badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      return { status: 'none', label: 'Não Agendado', badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (targetDate < todayStart) {
      return { 
        status: 'overdue', 
        label: 'Atrasado', 
        badgeClass: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 font-extrabold' 
      };
    } else if (targetDate >= todayStart && targetDate <= todayEnd) {
      return { 
        status: 'today', 
        label: 'Hoje', 
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 font-extrabold' 
      };
    } else {
      return { 
        status: 'scheduled', 
        label: 'Agendado', 
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 font-bold' 
      };
    }
  };

  const applyPresetSchedule = (daysToAdd: number, hoursStr: string = '14:00') => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    setFollowUpDateInput(toLocalDateString(date));
    setFollowUpTimeInput(hoursStr);
  };

  const handleOpenFollowUpModal = (contact: Contact) => {
    setEditingFollowUpContact(contact);
    setFollowUpLabelInput(contact.followUpLabel || '2º Contato');

    const targetDateStr = contact.nextFollowUpDate || contact.updatedAt || contact.lastInteractionDate || contact.createdAt;
    const refDate = new Date(targetDateStr);

    if (!isNaN(refDate.getTime())) {
      setFollowUpDateInput(toLocalDateString(refDate));
      const hours = String(refDate.getHours()).padStart(2, '0');
      const minutes = String(refDate.getMinutes()).padStart(2, '0');
      setFollowUpTimeInput(`${hours}:${minutes}`);
    } else {
      const today = toLocalDateString(new Date());
      setFollowUpDateInput(today);
      setFollowUpTimeInput('14:00');
    }
  };

  const handleSaveFollowUp = () => {
    if (!editingFollowUpContact) return;

    let isoDateString = '';
    if (followUpDateInput) {
      const timeToUse = followUpTimeInput || '12:00';
      const dateTimeStr = `${followUpDateInput}T${timeToUse}:00`;
      const parsed = new Date(dateTimeStr);
      if (!isNaN(parsed.getTime())) {
        isoDateString = parsed.toISOString();
      } else {
        isoDateString = new Date().toISOString();
      }
    } else {
      isoDateString = new Date().toISOString();
    }

    if (onUpdateFollowUp) {
      onUpdateFollowUp(
        editingFollowUpContact.id,
        followUpLabelInput || '2º Contato',
        isoDateString
      );
    }

    setEditingFollowUpContact(null);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    setDraggedContactId(contactId);
    e.dataTransfer.setData('text/plain', contactId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: FunnelStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stage: FunnelStage) => {
    if (dragOverStage === stage) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: FunnelStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const contactId = e.dataTransfer.getData('text/plain') || draggedContactId;
    if (contactId) {
      onUpdateStage(contactId, targetStage);
      setDraggedContactId(null);
    }
  };

  // Quick submit client handler
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    if (onQuickAddContact) {
      onQuickAddContact(
        quickName.trim(),
        quickPhone.trim(),
        parseFloat(quickValue) || 0,
        quickStage,
        selectedTagIds
      );
    } else {
      onOpenNewContactModal();
    }

    setQuickName('');
    setQuickPhone('');
    setQuickValue('');
    setSelectedTagIds([]);
    setIsQuickInsertOpen(false);
  };

  // Handle Inline Tag Creation
  const handleCreateNewTag = () => {
    if (!newTagName.trim() || !onCreateTag) return;
    const colorPreset = PRESET_COLORS[newTagColorIdx];
    const created = onCreateTag(newTagName.trim(), colorPreset.bgHex, colorPreset.textHex);
    if (created) {
      setSelectedTagIds((prev) => [...prev, created.id]);
    }
    setNewTagName('');
    setIsCreatingTagInline(false);
  };

  // Toggle tag selection in quick drawer
  const toggleQuickTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Helpers for stage navigation
  const getNextStage = (current: FunnelStage): FunnelStage | null => {
    const idx = STAGES.indexOf(current);
    if (idx < STAGES.length - 1) return STAGES[idx + 1];
    return null;
  };

  const getPrevStage = (current: FunnelStage): FunnelStage | null => {
    const idx = STAGES.indexOf(current);
    if (idx > 0) return STAGES[idx - 1];
    return null;
  };

  const renderContactCard = (contact: Contact) => {
    if (!contact) return null;
    const nextStage = getNextStage(contact.stage);
    const prevStage = getPrevStage(contact.stage);
    const stageConfig = STAGE_CONFIG[contact.stage] || { label: 'Desconhecido', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' };

    return (
      <div
        key={contact.id}
        draggable
        onDragStart={(e) => handleDragStart(e, contact.id)}
        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing space-y-2.5 group flex flex-col justify-between"
      >
        <div className="space-y-2.5">
          {/* Header Name + Company + Stage Badge */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <h4
                  onClick={() => {
                    if (onEditContact) {
                      onEditContact(contact);
                    } else {
                      onSelectContact(contact);
                    }
                  }}
                  className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer truncate flex items-center gap-1"
                  title="Clique no nome para editar as informações do contato"
                >
                  <span className="truncate">{contact.name}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                </h4>
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}
                >
                  {stageConfig.label}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{contact.company || 'Pessoa Física'}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditDealValue) {
                  onEditDealValue(contact);
                }
              }}
              className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 shrink-0 hover:text-indigo-700 dark:hover:text-indigo-300 hover:scale-105 active:scale-95 transition-all p-1 -m-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 cursor-pointer flex items-center gap-1 group/val"
              title="Clique para editar o valor estimado desta oportunidade"
            >
              <span>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue || 0)}
              </span>
              <Edit3 className="w-2.5 h-2.5 opacity-40 group-hover/val:opacity-100 text-indigo-500" />
            </button>
          </div>

          {/* Próxima Ação & Agendamento Pill com Alertas Visuais */}
          {(() => {
            const hasDate = Boolean(contact.nextFollowUpDate);
            const formattedDate = formatFollowUpDisplay(contact.nextFollowUpDate);
            const label = contact.followUpLabel || contact.nextActionTitle || '1º Contato';

            if (!hasDate) {
              return (
                <div className="w-full bg-amber-500/15 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-2.5 py-1.5 rounded-full flex items-center justify-between shadow-xs text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate font-extrabold text-[10.5px]">⚠️ Sem Próxima Ação</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFollowUpModal(contact);
                    }}
                    className="ml-1 px-2.5 py-0.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    + Definir Ação
                  </button>
                </div>
              );
            }

            // Check if overdue or today
            const nowTime = new Date();
            const dueDate = new Date(contact.nextFollowUpDate!);
            const isOverdue = !isNaN(dueDate.getTime()) && dueDate.getTime() < nowTime.getTime() && dueDate.toISOString().split('T')[0] < nowTime.toISOString().split('T')[0];
            const isToday = !isNaN(dueDate.getTime()) && dueDate.toISOString().split('T')[0] === nowTime.toISOString().split('T')[0];

            if (isOverdue) {
              return (
                <div className="w-full bg-rose-600 text-white px-2.5 py-1.5 rounded-full flex items-center justify-between shadow-xs text-[11px] font-bold animate-pulse">
                  <div className="flex items-center gap-1 truncate min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" />
                    <span className="truncate">
                      🚨 Vencida: {label} ({formattedDate})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFollowUpModal(contact);
                    }}
                    className="ml-1.5 px-2.5 py-0.5 rounded-full bg-rose-800 hover:bg-rose-900 text-white text-[9px] font-extrabold shrink-0 border border-rose-400/40 transition-colors cursor-pointer"
                  >
                    Reagendar
                  </button>
                </div>
              );
            }

            if (isToday) {
              return (
                <div className="w-full bg-indigo-600 text-white px-2.5 py-1.5 rounded-full flex items-center justify-between shadow-xs text-[11px] font-bold">
                  <div className="flex items-center gap-1 truncate min-w-0">
                    <Clock className="w-3.5 h-3.5 text-white shrink-0" />
                    <span className="truncate">
                      📌 Hoje: {label} ({formattedDate})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFollowUpModal(contact);
                    }}
                    className="ml-1.5 px-2.5 py-0.5 rounded-full bg-indigo-800 hover:bg-indigo-900 text-white text-[9px] font-extrabold shrink-0 border border-indigo-400/40 transition-colors cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>
              );
            }

            return (
              <div className="w-full bg-slate-800 text-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full flex items-center justify-between shadow-xs text-[11px] font-bold border border-slate-700">
                <div className="flex items-center gap-1 truncate min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="truncate">
                    {label}: {formattedDate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFollowUpModal(contact);
                  }}
                  className="ml-1.5 px-2.5 py-0.5 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-extrabold shrink-0 transition-colors cursor-pointer"
                >
                  Alterar
                </button>
              </div>
            );
          })()}

          {/* Tag Pills & Toggle Button */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1">
              {contact.tagIds.map((tId) => {
                const tag = tagMap.get(tId);
                if (!tag) return null;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleContactTag) {
                        onToggleContactTag(contact.id, tag.id);
                      }
                    }}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 group/tag hover:opacity-80 transition-all cursor-pointer shadow-xs active:scale-95"
                    style={{
                      backgroundColor: tag.bgHex || '#e0e7ff',
                      color: tag.textHex || '#3730a3',
                    }}
                    title="Clique para remover esta etiqueta"
                  >
                    <span>{tag.name}</span>
                    <span className="text-[10px] opacity-70 group-hover/tag:opacity-100 font-extrabold ml-0.5">×</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTagMenuContactId(activeTagMenuContactId === contact.id ? null : contact.id);
                }}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 border border-indigo-300/80 dark:border-indigo-800 transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
              >
                <TagIcon className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                <span>{activeTagMenuContactId === contact.id ? 'Fechar' : '+ Tag'}</span>
              </button>
            </div>

            {/* Inline Tag Selector Box */}
            {activeTagMenuContactId === contact.id && (
              <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 space-y-2.5 my-2 animate-fadeIn text-xs">
                <div className="flex items-center justify-between gap-1">
                  <div className="bg-rose-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold truncate">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      Data: {formatFollowUpDisplay(contact.nextFollowUpDate) || 'Sem data'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenFollowUpModal(contact)}
                      className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-800 hover:bg-rose-900 text-white text-[8px] font-extrabold shrink-0"
                    >
                      + Agendar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTagMenuContactId(null)}
                    className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold flex items-center gap-0.5 shrink-0"
                  >
                    <X className="w-3 h-3" />
                    <span>Fechar</span>
                  </button>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[9px] font-black tracking-wider text-slate-300">
                    <span>SELECIONAR ETIQUETAS:</span>
                    <span className="text-slate-400 font-semibold text-[8px]">CLIQUE PARA ALTERNAR</span>
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pt-0.5">
                    {tags.map((t) => {
                      const hasIt = contact.tagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onToggleContactTag && onToggleContactTag(contact.id, t.id)}
                          className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                            hasIt 
                              ? 'ring-2 ring-white shadow-md scale-105 font-extrabold' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: t.bgHex || '#3b82f6',
                            color: t.textHex || '#ffffff',
                          }}
                        >
                          <span>{t.name}</span>
                          <span className="font-black ml-0.5">{hasIt ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-800 space-y-1">
                  <span className="text-[9px] font-black text-slate-300 tracking-wider block">
                    CRIAR NOVA ETIQUETA:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={inlineTagName}
                      onChange={(e) => setInlineTagName(e.target.value)}
                      placeholder="Ex: Investimento, Agro, Casa..."
                      className="flex-1 px-2 py-1 rounded-lg text-[11px] bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!inlineTagName.trim()) return;
                        if (onCreateTag) {
                          const newT = onCreateTag(inlineTagName.trim());
                          if (onToggleContactTag) onToggleContactTag(contact.id, newT.id);
                          setInlineTagName('');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] shrink-0 active:scale-95"
                    >
                      + Criar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
          {/* Stage Quick Movement Controls */}
          {initialStageFilter === 'contato' ? (
            <button
              type="button"
              onClick={() => {
                if (onOpenStageMovement) onOpenStageMovement(contact, 'prospeccao');
                else onUpdateStage(contact.id, 'prospeccao');
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              title="Avançar lead para a etapa Vivo (Prospecção)"
            >
              <span>Avançar para Vivo</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          ) : initialStageFilter === 'quente' ? (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (onOpenStageMovement) onOpenStageMovement(contact, 'prospeccao');
                  else onUpdateStage(contact.id, 'prospeccao');
                }}
                className="py-1.5 px-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[10px] transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3 shrink-0" />
                <span>Voltar p/ Vivo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenStageMovement) onOpenStageMovement(contact, 'perdido');
                  else onUpdateStage(contact.id, 'perdido');
                }}
                className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <span>Fechar Venda 🏆</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {prevStage ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenStageMovement) {
                      onOpenStageMovement(contact, prevStage);
                    } else {
                      onUpdateStage(contact.id, prevStage);
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[10px] transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                  title={`Voltar para ${STAGE_CONFIG[prevStage].label}`}
                >
                  <ChevronLeft className="w-3 h-3 shrink-0" />
                  <span className="truncate">{STAGE_CONFIG[prevStage].label}</span>
                </button>
              ) : (
                <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-[9px] font-bold text-center border border-dashed border-slate-200 dark:border-slate-700">
                  Início
                </div>
              )}

              {nextStage ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenStageMovement) {
                      onOpenStageMovement(contact, nextStage);
                    } else {
                      onUpdateStage(contact.id, nextStage);
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow-xs transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                  title={`Avançar para ${STAGE_CONFIG[nextStage].label}`}
                >
                  <span className="truncate">{STAGE_CONFIG[nextStage].label}</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </button>
              ) : (
                <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-[9px] font-bold text-center border border-dashed border-slate-200 dark:border-slate-700">
                  Fim
                </div>
              )}
            </div>
          )}

          {/* Card Bottom Quick Contact Actions (WhatsApp, Call, Email, Details, Response) */}
          <div className="flex items-center justify-between gap-1 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <a
                href={getWhatsAppUrl(contact.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                title="Conversar no WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
              <a
                href={`tel:${contact.phone}`}
                className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 hover:bg-indigo-200 transition-colors"
                title="Ligar"
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
              {onOpenQuickResponse && (
                <button
                  type="button"
                  onClick={() => onOpenQuickResponse(contact)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                  title="Registrar resposta do lead"
                >
                  + Resposta
                </button>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Enviar E-mail"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <button
              onClick={() => onSelectContact(contact)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Ver Detalhes</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Stage Icons mapping
  const getStageIcon = (stage: FunnelStage) => {
    switch (stage) {
      case 'contato': return <Snowflake className="w-4 h-4 text-sky-500" />;
      case 'prospeccao': return <Zap className="w-4 h-4 text-blue-500" />;
      case 'proposta': return <Flame className="w-4 h-4 text-amber-500" />;
      case 'perdido': return <UserCheck className="w-4 h-4 text-emerald-500" />;
    }
  };

  // Helper para verificar se um contato pertence ao estágio correto
  const isContactInStage = (c: Contact, stg: FunnelStage) => {
    if (stg === 'contato') {
      return c.stage === 'contato' || !c.stage;
    }
    if (stg === 'prospeccao') {
      return c.stage === 'prospeccao';
    }
    if (stg === 'proposta') {
      return c.stage === 'proposta';
    }
    if (stg === 'perdido') {
      return c.stage === 'perdido';
    }
    return c.stage === stg;
  };

  // Dedicated stage helpers
  const isDedicatedStage = initialStageFilter !== 'all';
  const dedicatedStage = initialStageFilter !== 'all' ? (initialStageFilter as FunnelStage) : null;
  const dedicatedStageContacts = dedicatedStage
    ? contacts.filter((c) => isContactInStage(c, dedicatedStage))
    : contacts.filter((c) => c.stage !== 'perdido');
  const dedicatedStageValue = dedicatedStageContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const dedicatedStageLabel = dedicatedStage
    ? dedicatedStage === 'contato' ? '❄️ LEADS FRIOS'
      : dedicatedStage === 'prospeccao' ? '⚡ LEADS VIVOS'
      : dedicatedStage === 'proposta' ? '🔥 LEADS QUENTES'
      : '🏆 CLIENTES'
    : 'FUNIL DE VENDAS';

  // Metrics
  const activeContacts = contacts.filter((c) => c.stage !== 'perdido');
  const totalPipelineValue = activeContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const hotLeadsCount = contacts.filter((c) => isContactInStage(c, 'proposta')).length;
  const lostLeadsCount = contacts.filter((c) => c.stage === 'perdido').length;

  return (
    <div className="space-y-3 sm:space-y-4 pb-24 font-sans animate-fadeIn w-full max-w-full overflow-x-clip">
      {/* Top Header Controls (Sticky / Fixa na zona de cima) */}
      <div className="sticky top-[50px] sm:top-[60px] z-30 bg-slate-900/98 backdrop-blur-md text-white p-2.5 sm:p-4 rounded-2xl shadow-xl border border-slate-800 space-y-2 sm:space-y-2.5 w-full max-w-full transition-colors">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30 shrink-0">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-sky-600/30 text-sky-300 border border-sky-500/30 shrink-0">
              {dedicatedStageLabel}
            </span>
            <div className="h-4 w-px bg-slate-700 hidden sm:block shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide hidden sm:flex items-center gap-1 shrink-0">
              <span>{dedicatedStageContacts.length} Lead(s)</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              onClick={() => setIsQuickInsertOpen(!isQuickInsertOpen)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Lead</span>
              <span className="sm:hidden">Lead</span>
            </button>

            {onManageTags && (
              <button
                onClick={onManageTags}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1"
                title="Gerenciar Etiquetas"
              >
                <TagIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Etiquetas</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Search & Tag Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1.5 sm:pt-2 border-t border-slate-800">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder={isDedicatedStage ? `Buscar em ${STAGE_CONFIG[initialStageFilter].label}...` : "Buscar por nome, empresa, cidade..."}
              className="w-full pl-9 pr-7 py-1.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Stage Badge (when in dedicated tab like Frio, Vivo, Quente) or Filter Pills (when in all stages) */}
          {dedicatedStage ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-xs flex items-center gap-1.5 ring-1 ring-indigo-400/50">
                {getStageIcon(dedicatedStage)}
                <span>{STAGE_CONFIG[dedicatedStage].label} ({dedicatedStageContacts.length})</span>
              </span>
              <span className="text-[11px] font-bold text-slate-400 ml-1">
                Total: <strong className="text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(dedicatedStageValue)}</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setStageFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                  stageFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todos os Estágios ({contacts.length})
              </button>
              {STAGES.map((stg) => {
                const cfg = STAGE_CONFIG[stg];
                const isSel = stageFilter === stg;
                const count = contacts.filter((c) => isContactInStage(c, stg)).length;
                return (
                  <button
                    key={stg}
                    onClick={() => setStageFilter(stg)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
                      isSel
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {getStageIcon(stg)}
                    <span>{cfg.label} ({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Add Inline Drawer */}
        {isQuickInsertOpen && (
          <form
            onSubmit={handleQuickSubmit}
            className="p-3.5 rounded-2xl bg-slate-850 border border-slate-700/80 text-white space-y-3 animate-fadeIn mt-2"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Cadastro Rápido de Novo Lead</span>
              </span>
              <button
                type="button"
                onClick={() => setIsQuickInsertOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                  Nome do Contato / Empresa *
                </label>
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Ex: Carlos Silva (Tech Corp)"
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  value={quickValue}
                  onChange={(e) => setQuickValue(e.target.value)}
                  placeholder="15000"
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                  Estágio Inicial
                </label>
                <select
                  value={quickStage}
                  onChange={(e) => setQuickStage(e.target.value as FunnelStage)}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {STAGES.map((stg) => (
                    <option key={stg} value={stg}>
                      {STAGE_CONFIG[stg].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tag Selection Row */}
            <div className="space-y-1 pt-1">
              <label className="block text-[10px] font-semibold text-slate-400">
                Selecionar Etiquetas:
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => {
                  const isChecked = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleQuickTag(tag.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all border ${
                        isChecked
                          ? 'ring-2 ring-white scale-105 opacity-100'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: tag.bgHex || '#3b82f6',
                        color: tag.textHex || '#ffffff',
                        borderColor: tag.textHex || '#ffffff',
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}

                {/* Inline Tag Creator Toggle */}
                {onCreateTag && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingTagInline(!isCreatingTagInline)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700 text-indigo-300 hover:bg-slate-600 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nova Tag</span>
                  </button>
                )}
              </div>

              {/* Inline Tag Creator Input */}
              {isCreatingTagInline && (
                <div className="flex items-center gap-2 pt-2 animate-fadeIn">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nome da etiqueta..."
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-900 border border-slate-700 text-white placeholder-slate-500"
                  />
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.map((c, i) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setNewTagColorIdx(i)}
                        className={`w-4 h-4 rounded-full border ${
                          newTagColorIdx === i ? 'ring-2 ring-white scale-125' : 'opacity-70'
                        }`}
                        style={{ backgroundColor: c.bgHex }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewTag}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    Criar
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsQuickInsertOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95"
              >
                Salvar Lead
              </button>
            </div>
          </form>
        )}
      </div>

      {/* KANBAN BOARD / STAGE VIEW */}
      {stageFilter !== 'all' ? (
        // SINGLE STAGE FLUID VIEW (Tablet & Desktop multi-column grid)
        (() => {
          const stage = stageFilter;
          const config = STAGE_CONFIG[stage];
          const stageContacts = contacts.filter((c) => {
            if (!isContactInStage(c, stage)) return false;
            if (globalSearch.trim()) {
              const term = globalSearch.toLowerCase();
              const matchesGlobal = 
                c.name.toLowerCase().includes(term) ||
                c.company.toLowerCase().includes(term) ||
                c.phone.toLowerCase().includes(term) ||
                (c.city && c.city.toLowerCase().includes(term));
              if (!matchesGlobal) return false;
            }
            const colSearch = columnSearch[stage].toLowerCase().trim();
            if (colSearch) {
              const matchesCol =
                c.name.toLowerCase().includes(colSearch) ||
                c.company.toLowerCase().includes(colSearch) ||
                c.phone.toLowerCase().includes(colSearch) ||
                (c.city && c.city.toLowerCase().includes(colSearch));
              if (!matchesCol) return false;
            }
            if (selectedFilterTagId && !c.tagIds.includes(selectedFilterTagId)) {
              return false;
            }
            return true;
          });

          const totalStageValue = stageContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
          const isDragTarget = dragOverStage === stage;

          return (
            <div
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={(e) => handleDragLeave(e, stage)}
              onDrop={(e) => handleDrop(e, stage)}
              className={`w-full rounded-2xl border transition-all flex flex-col bg-white dark:bg-slate-900 shadow-sm ${
                isDragTarget
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Stage Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-xs">
                    {getStageIcon(stage)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                        {config.label}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {stageContacts.length} {stageContacts.length === 1 ? 'lead' : 'leads'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Total nesta etapa: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalStageValue)}</strong>
                    </p>
                  </div>
                </div>

                {/* Filter / Search within this stage */}
                <div className="relative w-full sm:w-auto sm:min-w-[200px] sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={columnSearch[stage]}
                    onChange={(e) => setColumnSearch({ ...columnSearch, [stage]: e.target.value })}
                    placeholder={`Filtrar ${config.label}...`}
                    className="w-full pl-9 pr-7 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
                  />
                  {columnSearch[stage] && (
                    <button
                      onClick={() => setColumnSearch({ ...columnSearch, [stage]: '' })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Cards Grid Area - FLUID RESPONSIVE GRID (1 col mobile, 2 cols tablet, 3-4 cols desktop) */}
              <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {stageContacts.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl my-2">
                    <p className="font-semibold text-sm text-slate-500 dark:text-slate-400">Nenhum contato nesta etapa</p>
                    <p className="text-xs text-slate-400 mt-1">Arraste ou crie novos leads para o estágio {config.label}</p>
                  </div>
                ) : (
                  stageContacts.map((contact) => renderContactCard(contact))
                )}
              </div>
            </div>
          );
        })()
      ) : (
        // ALL 4 STAGES KANBAN BOARD
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
          {STAGES.map((stage) => {
            const config = STAGE_CONFIG[stage];
            const stageContacts = contacts.filter((c) => {
              if (!isContactInStage(c, stage)) return false;
              if (globalSearch.trim()) {
                const term = globalSearch.toLowerCase();
                const matchesGlobal = 
                  c.name.toLowerCase().includes(term) ||
                  c.company.toLowerCase().includes(term) ||
                  c.phone.toLowerCase().includes(term) ||
                  (c.city && c.city.toLowerCase().includes(term));
                if (!matchesGlobal) return false;
              }
              const colSearch = columnSearch[stage].toLowerCase().trim();
              if (colSearch) {
                const matchesCol =
                  c.name.toLowerCase().includes(colSearch) ||
                  c.company.toLowerCase().includes(colSearch) ||
                  c.phone.toLowerCase().includes(colSearch) ||
                  (c.city && c.city.toLowerCase().includes(colSearch));
                if (!matchesCol) return false;
              }
              if (selectedFilterTagId && !c.tagIds.includes(selectedFilterTagId)) {
                return false;
              }
              return true;
            });

            const totalStageValue = stageContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
            const isDragTarget = dragOverStage === stage;

            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={(e) => handleDragLeave(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                className={`rounded-2xl border transition-all flex flex-col min-h-[480px] bg-white dark:bg-slate-900 shadow-xs ${
                  isDragTarget
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStageIcon(stage)}
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {config.label}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {stageContacts.length}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalStageValue)}
                    </span>
                  </div>

                  {/* Column Search Filter */}
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={columnSearch[stage]}
                      onChange={(e) => setColumnSearch({ ...columnSearch, [stage]: e.target.value })}
                      placeholder={`Filtrar ${config.label}...`}
                      className="w-full pl-7 pr-6 py-1 rounded-lg text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {columnSearch[stage] && (
                      <button
                        onClick={() => setColumnSearch({ ...columnSearch, [stage]: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards List Area */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[650px] no-scrollbar">
                  {stageContacts.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2">
                      <p className="font-semibold text-slate-500 dark:text-slate-400">Nenhum contato</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Arraste ou crie novos leads aqui</p>
                    </div>
                  ) : (
                    stageContacts.map((contact) => renderContactCard(contact))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT FOLLOW-UP MODAL MATCHING SCREENSHOT 3 */}
      {editingFollowUpContact && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-800 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Agendar Retorno & Follow-Up
                  </h3>
                  <p className="text-xs text-slate-400 font-medium truncate max-w-[260px]">
                    {editingFollowUpContact.name} {editingFollowUpContact.phone && `• ${editingFollowUpContact.phone}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingFollowUpContact(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ETIQUETA DE FOLLOW-UP */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-rose-400 uppercase tracking-wider">
                ETIQUETA DE FOLLOW-UP (EX: 2º CONTATO)
              </label>
              
              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1.5">
                {['1º Contato', '2º Contato', '3º Contato', 'Entrevista', 'Retorno Pendente', 'Reunião Agendada', 'Aguardando Resposta'].map((chip) => {
                  const isSel = followUpLabelInput === chip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setFollowUpLabelInput(chip)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={followUpLabelInput}
                onChange={(e) => setFollowUpLabelInput(e.target.value)}
                placeholder="Ex: 1º Contato, 2º Contato..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="h-px bg-slate-800 my-1" />

            {/* DATA DO RETORNO & HORÁRIO DO RETORNO */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  DATA DO RETORNO
                </label>
                <input
                  type="date"
                  value={followUpDateInput}
                  onChange={(e) => setFollowUpDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                  HORÁRIO DO RETORNO
                </label>
                <input
                  type="time"
                  value={followUpTimeInput}
                  onChange={(e) => setFollowUpTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* ATALHOS DE DATA */}
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                ATALHOS DE DATA:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPresetSchedule(0)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetSchedule(1)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Amanhã
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetSchedule(2)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Em 2 dias
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetSchedule(3)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Em 3 dias
                </button>
              </div>
            </div>

            {/* ATALHOS DE HORÁRIO */}
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                ATALHOS DE HORÁRIO:
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {['09:00', '10:30', '14:00', '15:30', '17:00'].map((timeStr) => (
                  <button
                    key={timeStr}
                    type="button"
                    onClick={() => setFollowUpTimeInput(timeStr)}
                    className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors text-center cursor-pointer"
                  >
                    {timeStr}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingFollowUpContact(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFollowUp}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Agendamento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
