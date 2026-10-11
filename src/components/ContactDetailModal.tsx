import React, { useState } from 'react';
import { 
  Contact, 
  Tag, 
  Interaction, 
  InteractionType, 
  FunnelStage, 
  STAGE_CONFIG 
} from '../types';
import { getWhatsAppUrl } from '../utils/whatsapp';
import { storageService } from '../services/storage';
import { 
  X, 
  PhoneCall, 
  MessageSquare, 
  Mail, 
  Building2, 
  MapPin, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  CheckCircle,
  FileText,
  UserCheck,
  Tag as TagIcon,
  ChevronDown,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

interface ContactDetailModalProps {
  contact: Contact;
  tags: Tag[];
  interactions: Interaction[];
  onClose: () => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onAddInteraction: (data: Omit<Interaction, 'id' | 'synced'>) => void;
  onUpdateStage: (contactId: string, stage: FunnelStage) => void;
  onOpenStageMovement?: (contact: Contact, targetStage: FunnelStage) => void;
  onOpenQuickResponse?: (contact: Contact) => void;
  onOpenScheduleAction?: (contact: Contact) => void;
  onEditDealValue?: (contact: Contact) => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  tags,
  interactions,
  onClose,
  onEditContact,
  onDeleteContact,
  onAddInteraction,
  onUpdateStage,
  onOpenStageMovement,
  onOpenQuickResponse,
  onOpenScheduleAction,
  onEditDealValue,
}) => {
  const [showLogForm, setShowLogForm] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [interactionType, setInteractionType] = useState<InteractionType>('whatsapp');
  const [summary, setSummary] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');

  const contactInteractions = interactions.filter((i) => i.contactId === contact.id);
  const tagMap = new Map<string, Tag>(tags.map((t) => [t.id, t]));

  const handleSubmitInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    onAddInteraction({
      contactId: contact.id,
      type: interactionType,
      summary: summary.trim(),
      date: new Date().toISOString(),
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp).toISOString() : undefined,
      dealValueSnapshot: contact.dealValue,
      authorName: 'Você (Vendedor)',
    });

    setSummary('');
    setNextFollowUp('');
    setShowLogForm(false);
  };

  const getInteractionIcon = (type: InteractionType) => {
    switch (type) {
      case 'call': return <PhoneCall className="w-4 h-4 text-indigo-500" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'email': return <Mail className="w-4 h-4 text-sky-500" />;
      case 'meeting': return <UserCheck className="w-4 h-4 text-purple-500" />;
      case 'proposal': return <FileText className="w-4 h-4 text-amber-500" />;
      case 'stage_change': return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
      case 'response_logged': return <MessageSquare className="w-4 h-4 text-teal-500" />;
      case 'task_completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 h-full overflow-y-auto p-5 sm:p-6 flex flex-col justify-between shadow-2xl border-l border-slate-200 dark:border-slate-800"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 1.25rem), 1.25rem)',
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 1.5rem), 1.5rem)',
        }}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Detalhes do Contato
              </span>
              <h2 
                onClick={() => onEditContact(contact)}
                className="text-xl font-bold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                title="Clique no nome para editar as informações do contato"
              >
                <span>{contact.name}</span>
                <Edit3 className="w-4 h-4 text-slate-400 hover:text-indigo-500" />
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditContact(contact)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors"
                title="Editar contato"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Info Bar */}
          <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Empresa / Cargo</p>
                <p className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span>{contact.company || 'Pessoa Física'} {contact.role ? `• ${contact.role}` : ''}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onEditDealValue) onEditDealValue(contact);
                }}
                className="text-right p-1 -m-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                title="Clique para editar o valor estimado desta oportunidade"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                  <span>Valor da Oportunidade</span>
                  <Edit3 className="w-3 h-3 opacity-60 group-hover:opacity-100 text-indigo-500" />
                </p>
                <p className="font-bold text-base text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contact.dealValue || 0)}
                </p>
              </button>
            </div>

            {/* Stage Selector */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Estágio no Funil:</span>
              <select
                value={contact.stage}
                onChange={(e) => {
                  const target = e.target.value as FunnelStage;
                  if (onOpenStageMovement) {
                    onOpenStageMovement(contact, target);
                  } else {
                    onUpdateStage(contact.id, target);
                  }
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(STAGE_CONFIG)
                  .filter(([key]) => key !== 'qualificacao')
                  .map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Zona de Guerra: Temperatura & Triagem de Descarte */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500 dark:text-slate-400">Status na Zona de Guerra:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  contact.temperature === 'quente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                  contact.temperature === 'morno' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                  contact.temperature === 'frio' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                  contact.temperature === 'descartado' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {contact.temperature === 'quente' ? '🔥 Quente' :
                   contact.temperature === 'morno' ? '⚡ Morno' :
                   contact.temperature === 'frio' ? '🧊 Frio' :
                   contact.temperature === 'descartado' ? '❌ Descartado' :
                   '❄️ Sem Temperatura'}
                </span>
              </div>
              {contact.discardReason && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Motivo de Triagem/Descarte:</span>
                  <span className="font-bold text-[11px] text-rose-600 dark:text-rose-400 uppercase">
                    {contact.discardReason === 'recuperar' ? '🔄 A Recuperar' :
                     contact.discardReason === 'desinteressado' ? '⚪ Desinteressado' :
                     contact.discardReason === 'perdido' ? '❌ Perdido' :
                     contact.discardReason === 'morto' ? '💀 Lead Morto' :
                     contact.discardReason === 'invalido' ? '⚠️ Inválido' :
                     `🏷️ ${contact.discardReason}`}
                  </span>
                </div>
              )}
            </div>

            {/* Next Action Box */}
            <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Próxima Ação Comercial</span>
                </span>
                {onOpenScheduleAction && (
                  <button
                    type="button"
                    onClick={() => onOpenScheduleAction(contact)}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {contact.nextFollowUpDate ? 'Reagendar' : '+ Definir'}
                  </button>
                )}
              </div>

              {contact.nextFollowUpDate ? (
                <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-indigo-950 dark:text-indigo-200 truncate">
                      {contact.followUpLabel || contact.nextActionTitle || 'Retorno'}
                    </p>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                      {new Date(contact.nextFollowUpDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider">
                      Agendado
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Deseja remover a próxima ação comercial e retornar ao estado de Sem Próxima Ação?')) {
                          const tasks = storageService.getTasks({ contactId: contact.id });
                          const pending = tasks.find(t => !t.completed);
                          if (pending) storageService.deleteTask(pending.id);
                          storageService.saveContact({
                            ...contact,
                            nextFollowUpDate: undefined,
                            followUpLabel: undefined,
                            nextActionType: undefined,
                            nextActionTitle: undefined,
                            nextActionDate: undefined,
                            nextActionTime: undefined,
                            nextActionNotes: undefined,
                          });
                        }
                      }}
                      className="p-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                      title="Remover ação e retornar para Sem Próxima Ação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Sem Próxima Ação</span>
                  </div>
                  {onOpenScheduleAction && (
                    <button
                      type="button"
                      onClick={() => onOpenScheduleAction(contact)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black shrink-0 cursor-pointer"
                    >
                      + Definir Ação
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Communication Links & Fast Response */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <a
                href={getWhatsAppUrl(contact.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Conversar no WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`tel:${contact.phone}`}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Ligar</span>
              </a>
              {onOpenQuickResponse && (
                <button
                  type="button"
                  onClick={() => onOpenQuickResponse(contact)}
                  className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>+ Resposta</span>
                </button>
              )}
            </div>
          </div>

          {/* Tag Badges */}
          {contact.tagIds.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Etiquetas Atribuídas:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {contact.tagIds.map((tId) => {
                  const tag = tagMap.get(tId);
                  if (!tag) return null;
                  return (
                    <span
                      key={tag.id}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold"
                      style={{
                        backgroundColor: tag.bgHex || '#e0e7ff',
                        color: tag.textHex || '#3730a3',
                      }}
                    >
                      {tag.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactions History Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Histórico de Interações ({contactInteractions.length})</span>
              </h3>

              <button
                onClick={() => setShowLogForm(!showLogForm)}
                className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Interação</span>
              </button>
            </div>

            {/* Log New Interaction Form */}
            {showLogForm && (
              <form onSubmit={handleSubmitInteraction} className="mb-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-300">
                  Registrar Nova Ação / Atendimento
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Tipo de Canal
                    </label>
                    <select
                      value={interactionType}
                      onChange={(e) => setInteractionType(e.target.value as InteractionType)}
                      className="w-full p-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="call">Ligação Telefônica</option>
                      <option value="email">E-mail Comercial</option>
                      <option value="meeting">Reunião Presencial/Online</option>
                      <option value="proposal">Envio de Proposta</option>
                      <option value="note">Nota Interna</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Próximo Follow-up
                    </label>
                    <input
                      type="date"
                      value={nextFollowUp}
                      onChange={(e) => setNextFollowUp(e.target.value)}
                      className="w-full p-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Resumo do Atendimento / Detalhes
                  </label>
                  <textarea
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Ex: Cliente aprovou o prazo, mas pediu desconto no pagamento à vista..."
                    className="w-full p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-200/50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Salvar Registro
                  </button>
                </div>
              </form>
            )}

            {/* Timeline List */}
            <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {contactInteractions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Nenhum histórico registrado para este contato ainda.
                </div>
              ) : (
                contactInteractions.map((item) => {
                  const dateObj = new Date(item.date);
                  const formattedStr = dateObj.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={item.id} className="relative pl-8">
                      {/* Timeline Dot */}
                      <div className="absolute left-0 top-1.5 p-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        {getInteractionIcon(item.type)}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                            {item.type} • {item.authorName || 'Vendedor'}
                          </span>
                          <span>{formattedStr}</span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                          {item.summary}
                        </p>
                        {item.nextFollowUp && (
                          <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Retorno agendado para:{' '}
                              {new Date(item.nextFollowUp).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Delete Contact Footer Button */}
        <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
          {isConfirmingDelete ? (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                Confirmar exclusão definitiva?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteContact(contact.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  Excluir
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Contato do CRM</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
