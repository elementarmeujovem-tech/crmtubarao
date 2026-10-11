import React, { useState, useEffect } from 'react';
import { 
  Contact, 
  Tag, 
  FunnelStage, 
  STAGE_CONFIG,
  TaskType,
  TASK_TYPE_CONFIG
} from '../types';
import { toLocalDateString } from '../utils/calendarSync';
import { 
  X, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Tag as TagIcon, 
  Clock, 
  Calendar,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronUp,
  UserPlus,
  UserCheck,
  FileText
} from 'lucide-react';

interface ContactModalProps {
  contactToEdit?: Contact | null;
  tags: Tag[];
  onClose: () => void;
  onSave: (contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'synced'> & { id?: string }) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  contactToEdit,
  tags,
  onClose,
  onSave,
}) => {
  // Campos principais
  const [name, setName] = useState(contactToEdit?.name || '');
  const [phone, setPhone] = useState(contactToEdit?.phone || '');
  const [email, setEmail] = useState(contactToEdit?.email || '');
  const [stage, setStage] = useState<FunnelStage>(contactToEdit?.stage || 'contato');
  const [tagIds, setTagIds] = useState<string[]>(contactToEdit?.tagIds || []);
  const [notes, setNotes] = useState(contactToEdit?.notes || '');

  // Campos complementares (opcionais)
  const [showExtraDetails, setShowExtraDetails] = useState(Boolean(
    contactToEdit?.company || 
    contactToEdit?.role || 
    contactToEdit?.city || 
    contactToEdit?.dealValue || 
    contactToEdit?.nextFollowUpDate
  ));
  const [company, setCompany] = useState(contactToEdit?.company || '');
  const [role, setRole] = useState(contactToEdit?.role || '');
  const [city, setCity] = useState(contactToEdit?.city || '');
  const [dealValue, setDealValue] = useState<number>(contactToEdit?.dealValue || 0);

  // Próxima Ação Comercial
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = toLocalDateString(tomorrowDate);
  const [hasAction, setHasAction] = useState(false);
  const [actionTitle, setActionTitle] = useState(contactToEdit?.followUpLabel || contactToEdit?.nextActionTitle || '1º Contato');
  const [actionType, setActionType] = useState<TaskType>(contactToEdit?.nextActionType || 'call');
  const [actionDate, setActionDate] = useState(() => {
    if (contactToEdit?.nextActionDate) return contactToEdit.nextActionDate;
    if (contactToEdit?.nextFollowUpDate) {
      const d = new Date(contactToEdit.nextFollowUpDate);
      if (!isNaN(d.getTime())) return toLocalDateString(d);
    }
    return tomorrowStr;
  });
  const [actionTime, setActionTime] = useState(contactToEdit?.nextActionTime || '14:00');
  const [actionNotes, setActionNotes] = useState(contactToEdit?.nextActionNotes || '');

  useEffect(() => {
    if (contactToEdit) {
      setName(contactToEdit.name || '');
      setPhone(contactToEdit.phone || '');
      setEmail(contactToEdit.email || '');
      setStage(contactToEdit.stage || 'contato');
      setTagIds(contactToEdit.tagIds || []);
      setNotes(contactToEdit.notes || '');
      setCompany(contactToEdit.company || '');
      setRole(contactToEdit.role || '');
      setCity(contactToEdit.city || '');
      setDealValue(contactToEdit.dealValue || 0);
      setHasAction(Boolean(contactToEdit.nextFollowUpDate));
      setShowExtraDetails(Boolean(
        contactToEdit.company || 
        contactToEdit.role || 
        contactToEdit.city || 
        contactToEdit.dealValue || 
        contactToEdit.nextFollowUpDate
      ));
    } else {
      // Padrão para novo cadastro conforme solicitado
      setName('');
      setPhone('');
      setEmail('');
      setStage('contato'); // Padrão: "Novo lead — ainda não abordado"
      setTagIds([]);
      setNotes('');
      setCompany('');
      setRole('');
      setCity('');
      setDealValue(0);
      setShowExtraDetails(false);
      setHasAction(false);
    }
  }, [contactToEdit]);

  const handleToggleTag = (tagId: string) => {
    if (tagIds.includes(tagId)) {
      setTagIds(tagIds.filter((id) => id !== tagId));
    } else {
      setTagIds([...tagIds, tagId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const dueIso = hasAction && actionDate ? `${actionDate}T${actionTime || '14:00'}:00.000Z` : undefined;

    onSave({
      id: contactToEdit?.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      stage,
      tagIds,
      notes: notes.trim(),
      company: company.trim(),
      role: role.trim(),
      city: city.trim(),
      dealValue: Number(dealValue) || 0,
      lastInteractionDate: contactToEdit?.lastInteractionDate || new Date().toISOString(),
      nextFollowUpDate: dueIso,
      followUpLabel: hasAction ? (actionTitle.trim() || 'Retorno') : undefined,
      nextActionType: hasAction ? actionType : undefined,
      nextActionTitle: hasAction ? (actionTitle.trim() || 'Retorno') : undefined,
      nextActionDate: hasAction ? actionDate : undefined,
      nextActionTime: hasAction ? actionTime : undefined,
      nextActionNotes: hasAction ? actionNotes.trim() : undefined,
      nextActionCompleted: false,
      temperature: contactToEdit?.temperature,
      discardReason: contactToEdit?.discardReason,
      firstApproachAt: contactToEdit?.firstApproachAt,
      firstApproachResult: contactToEdit?.firstApproachResult,
      firstApproachChannel: contactToEdit?.firstApproachChannel,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {contactToEdit ? 'Editar Lead' : 'Cadastrar Novo Contato'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {contactToEdit ? 'Atualize os dados comerciais do contato' : 'Preencha os dados essenciais para registrar o lead no CRM'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 1. Nome — obrigatório */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Nome *</span>
              </span>
              <span className="text-[10px] font-bold text-rose-500">Obrigatório</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Eduardo Santos"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>
          </div>

          {/* 2. WhatsApp — obrigatório */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp *</span>
              </span>
              <span className="text-[10px] font-bold text-rose-500">Obrigatório</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: (11) 98765-4321"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                required
              />
            </div>
          </div>

          {/* 3. E-mail — opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>E-mail</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: carlos@empresa.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 4. Fase Atual do Funil de Vendas — selecionável, com padrão “Novo lead — ainda não abordado” */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Fase Atual do Funil de Vendas</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${STAGE_CONFIG[stage]?.bg} ${STAGE_CONFIG[stage]?.color} ${STAGE_CONFIG[stage]?.border}`}>
                {STAGE_CONFIG[stage]?.label}
              </span>
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as FunnelStage)}
              className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="contato">Novo lead — ainda não abordado</option>
              <option value="prospeccao">Vivo — Em abordagem / Qualificação</option>
              <option value="proposta">Quente — Proposta enviada / Em negociação</option>
              <option value="perdido">Clientes — Venda realizada / Convertido</option>
            </select>
          </div>

          {/* 5. Etiquetas de Organização — opcionais, com seleção rápida das etiquetas já cadastradas no sistema */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Etiquetas de Organização</span>
              </label>
              <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
            </div>

            {tags && tags.length > 0 ? (
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const isChecked = tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer select-none ${
                          isChecked
                            ? 'ring-2 ring-indigo-600 ring-offset-1 dark:ring-offset-slate-900 scale-102 shadow-xs font-extrabold'
                            : 'opacity-70 hover:opacity-100 hover:scale-102 border border-slate-200/80 dark:border-slate-700'
                        }`}
                        style={{
                          backgroundColor: tag.bgHex || '#e0e7ff',
                          color: tag.textHex || '#3730a3',
                        }}
                      >
                        {isChecked ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                Nenhuma etiqueta cadastrada ainda.
              </p>
            )}
          </div>

          {/* 6. Campo de texto “Anotação” — opcional */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Anotação</span>
              </label>
              <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite anotações ou detalhes sobre este lead..."
              className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Seção Complementar Opcional: Empresa, Cargo, Valor, Próxima Ação */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowExtraDetails(!showExtraDetails)}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>+ Detalhes complementares (Empresa, Cargo, Valor, Próxima Ação)</span>
              {showExtraDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showExtraDetails && (
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Empresa
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Ex: Tech Soluções"
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Ex: Diretor Comercial"
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Cidade - UF
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Curitiba - PR"
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Valor Estimado (R$)
                    </label>
                    <input
                      type="number"
                      value={dealValue || ''}
                      onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: 50000"
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* Próxima Ação Comercial Opcional */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAction}
                        onChange={(e) => setHasAction(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        Agendar Próxima Ação Comercial
                      </span>
                    </label>
                  </div>

                  {hasAction && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Tipo de Canal
                          </label>
                          <select
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value as TaskType)}
                            className="w-full px-2 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          >
                            {Object.entries(TASK_TYPE_CONFIG).map(([k, cfg]) => (
                              <option key={k} value={k}>{cfg.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Atividade / Título
                          </label>
                          <input
                            type="text"
                            value={actionTitle}
                            onChange={(e) => setActionTitle(e.target.value)}
                            placeholder="Ex: 1º Contato WhatsApp"
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Data
                          </label>
                          <input
                            type="date"
                            value={actionDate}
                            onChange={(e) => setActionDate(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Horário
                          </label>
                          <input
                            type="time"
                            value={actionTime}
                            onChange={(e) => setActionTime(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder="Observação da tarefa (opcional)"
                          className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 7. Botão principal “Cadastrar lead” */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{contactToEdit ? 'Atualizar lead' : 'Cadastrar lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
