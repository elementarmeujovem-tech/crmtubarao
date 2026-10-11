import React, { useState } from 'react';
import { Contact, TaskType } from '../types';
import { 
  X, 
  MessageSquare, 
  PhoneCall, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ThumbsUp, 
  ThumbsDown, 
  HelpCircle,
  FileCheck
} from 'lucide-react';

interface QuickResponseModalProps {
  contact: Contact;
  onClose: () => void;
  onSave: (data: {
    responseType: string;
    notes?: string;
    nextAction?: {
      title: string;
      type: TaskType;
      date: string;
      time: string;
      notes?: string;
    };
  }) => void;
}

const PRESET_RESPONSES = [
  { label: 'Interessado - Pediu Proposta', icon: ThumbsUp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300' },
  { label: 'Pediu para Ligar Mais Tarde', icon: Clock, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-300' },
  { label: 'Não Atendeu / Caixa Postal', icon: PhoneCall, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-300' },
  { label: 'Mensagem Enviada no WhatsApp', icon: MessageSquare, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-300' },
  { label: 'Aguardando Aprovação de Sócio/Família', icon: HelpCircle, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-300' },
  { label: 'Sem Interesse no Momento', icon: ThumbsDown, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-300' },
  { label: 'Enviou Documentos / Informações', icon: FileCheck, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300' },
];

export const QuickResponseModal: React.FC<QuickResponseModalProps> = ({
  contact,
  onClose,
  onSave,
}) => {
  const [selectedResponse, setSelectedResponse] = useState<string>(PRESET_RESPONSES[0].label);
  const [customResponse, setCustomResponse] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Next action
  const [scheduleNext, setScheduleNext] = useState<boolean>(true);
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [actionTitle, setActionTitle] = useState<string>('Retorno para acompanhamento');
  const [actionType, setActionType] = useState<TaskType>('call');
  const [actionDate, setActionDate] = useState<string>(tomorrowStr);
  const [actionTime, setActionTime] = useState<string>('14:30');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalResponse = customResponse.trim() ? customResponse.trim() : selectedResponse;

    onSave({
      responseType: finalResponse,
      notes: notes.trim() || undefined,
      nextAction: scheduleNext
        ? {
            title: actionTitle.trim() || 'Retorno',
            type: actionType,
            date: actionDate || tomorrowStr,
            time: actionTime || '14:30',
          }
        : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Registrar Resposta do Lead
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lead: <span className="font-bold text-slate-700 dark:text-slate-300">{contact.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Preset responses */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Qual foi a resposta do cliente? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PRESET_RESPONSES.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedResponse === item.label && !customResponse.trim();
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSelectedResponse(item.label);
                      setCustomResponse('');
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-400/40 font-bold'
                        : `${item.color} hover:opacity-90 dark:border-slate-700`
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : ''}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <input
                type="text"
                placeholder="Ou digite outra resposta..."
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Detalhes da Resposta / Anotações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Disse que precisa falar com a esposa e pediu para ligar amanhã às 15h..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Schedule Next Action */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Agendar Próximo Contato / Retorno
              </span>
            </label>

            {scheduleNext && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    Canal
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as TaskType)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="call">Ligação</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="meeting">Reunião</option>
                    <option value="return">Retorno</option>
                    <option value="proposal">Proposta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    Data
                  </label>
                  <input
                    type="date"
                    value={actionDate}
                    onChange={(e) => setActionDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={actionTime}
                    onChange={(e) => setActionTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Resposta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
