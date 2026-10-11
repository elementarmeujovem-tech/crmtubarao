import React, { useState } from 'react';
import { Contact, FunnelStage, STAGE_CONFIG, TaskType, TASK_TYPE_CONFIG } from '../types';
import { toLocalDateString } from '../utils/calendarSync';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  FileText,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Users
} from 'lucide-react';

interface StageMovementModalProps {
  contact: Contact;
  targetStage: FunnelStage;
  onClose: () => void;
  onConfirm: (data: {
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
  }) => void;
}

const FORWARD_REASONS = [
  'Contato inicial realizado com sucesso',
  'Interesse confirmado e perfil qualificado',
  'Proposta comercial apresentada/enviada',
  'Negociação de valores em andamento',
  'Contrato aceito / Venda concluída!',
];

const BACKWARD_REASONS = [
  'Cliente não respondeu às tentativas',
  'Achou o preço/orçamento elevado',
  'Interesse esfriou / Adiou decisão',
  'Optou por solução da concorrência',
  'Dificuldade com crédito ou documentação',
  'Sem perfil no momento / Desqualificado',
];

export const StageMovementModal: React.FC<StageMovementModalProps> = ({
  contact,
  targetStage: initialTargetStage,
  onClose,
  onConfirm,
}) => {
  const currentStage = contact.stage;
  const stageKeys: FunnelStage[] = ['contato', 'prospeccao', 'proposta', 'perdido'];
  const [activeTargetStage, setActiveTargetStage] = useState<FunnelStage>(initialTargetStage);

  const currentIndex = stageKeys.indexOf(currentStage);
  const targetIndex = stageKeys.indexOf(activeTargetStage);
  const isMovingForward = targetIndex > currentIndex;
  const isMovingBackward = targetIndex < currentIndex;

  const defaultReasons = isMovingBackward ? BACKWARD_REASONS : FORWARD_REASONS;

  const [selectedReason, setSelectedReason] = useState<string>(defaultReasons[0] || '');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Next action scheduling
  const [scheduleNextAction, setScheduleNextAction] = useState<boolean>(false);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = toLocalDateString(tomorrowDate);
  const [actionTitle, setActionTitle] = useState<string>(
    activeTargetStage === 'proposta' 
      ? 'Apresentar proposta comercial'
      : activeTargetStage === 'prospeccao'
      ? 'Follow-up de qualificação'
      : activeTargetStage === 'perdido'
      ? 'Pós-venda e boas-vindas'
      : 'Retorno de contato'
  );
  const [actionType, setActionType] = useState<TaskType>(
    activeTargetStage === 'proposta' ? 'proposal' : activeTargetStage === 'perdido' ? 'whatsapp' : 'call'
  );
  const [actionDate, setActionDate] = useState<string>(tomorrowStr);
  const [actionTime, setActionTime] = useState<string>('10:00');
  const [actionNotes, setActionNotes] = useState<string>('');

  // Handle stage selection inside modal
  const handleSelectTargetStage = (stg: FunnelStage) => {
    setActiveTargetStage(stg);
    const newTargetIdx = stageKeys.indexOf(stg);
    const isForward = newTargetIdx > currentIndex;
    const reasons = isForward ? FORWARD_REASONS : BACKWARD_REASONS;
    setSelectedReason(reasons[0] || '');
    setCustomReason('');
    setActionTitle(
      stg === 'proposta' 
        ? 'Apresentar proposta comercial'
        : stg === 'prospeccao'
        ? 'Follow-up de qualificação'
        : stg === 'perdido'
        ? 'Pós-venda e boas-vindas'
        : 'Retorno de contato'
    );
    setActionType(stg === 'proposta' ? 'proposal' : stg === 'perdido' ? 'whatsapp' : 'call');
  };

  const currentConfig = STAGE_CONFIG[currentStage];
  const targetConfig = STAGE_CONFIG[activeTargetStage];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;

    onConfirm({
      newStage: activeTargetStage,
      reason: finalReason,
      notes: notes.trim() || undefined,
      nextAction: scheduleNextAction
        ? {
            title: actionTitle.trim() || 'Próximo retorno',
            type: actionType,
            date: actionDate || tomorrowStr,
            time: actionTime || '14:00',
            notes: actionNotes.trim() || undefined,
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
            <div className={`p-2 rounded-xl ${isMovingForward ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400'}`}>
              {isMovingForward ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Movimentação no Funil
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
          {/* Stage Transition Visual Banner */}
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <div className="flex-1 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Etapa Atual</span>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black border ${currentConfig.bg} ${currentConfig.color} ${currentConfig.border}`}>
                  {currentConfig.label}
                </span>
              </div>

              <div className="flex items-center justify-center text-slate-400 shrink-0">
                {isMovingForward ? <ArrowRight className="w-5 h-5 text-indigo-500" /> : isMovingBackward ? <ArrowLeft className="w-5 h-5 text-amber-500" /> : <span className="text-xs font-bold text-slate-400">=</span>}
              </div>

              <div className="flex-1 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  {isMovingForward ? 'Avançar Para' : isMovingBackward ? 'Retroceder Para' : 'Manter em'}
                </span>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black border ${targetConfig.bg} ${targetConfig.color} ${targetConfig.border} ring-2 ${isMovingForward ? 'ring-indigo-500/40' : 'ring-amber-500/40'}`}>
                  {targetConfig.label}
                </span>
              </div>
            </div>

            {/* Quick Stage Switcher */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Escolha o destino no funil:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {stageKeys.map((stg) => {
                  const cfg = STAGE_CONFIG[stg];
                  const isCurrent = contact.stage === stg;
                  const isSelected = activeTargetStage === stg;
                  const stgIndex = stageKeys.indexOf(stg);
                  const isFwd = stgIndex > currentIndex;
                  const isBwd = stgIndex < currentIndex;

                  return (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => handleSelectTargetStage(stg)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-black border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-indigo-500 shadow-xs scale-102`
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cfg.label}</span>
                      <span className="text-[8px] font-semibold opacity-75">
                        {isCurrent ? '(Atual)' : isFwd ? 'Avançar' : 'Voltar'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {isMovingBackward ? 'Motivo do Retrocesso / Mudança *' : 'Motivo / Marco do Avanço *'}
            </label>
            
            <div className="flex flex-wrap gap-1.5">
              {defaultReasons.map((reason) => {
                const isSelected = selectedReason === reason && !customReason.trim();
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setSelectedReason(reason);
                      setCustomReason('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>

            {/* Custom Reason Input */}
            <div className="pt-1">
              <input
                type="text"
                placeholder="Ou digite outro motivo específico..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Internal Observation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observações Adicionais (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente solicitou revisão dos prazos para fechamento nesta sexta..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Next Action Box */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleNextAction}
                  onChange={(e) => setScheduleNextAction(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Agendar Próxima Ação Comercial
                </span>
              </label>

              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Nenhum lead esquecido
              </span>
            </div>

            {scheduleNextAction && (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                      Tipo de Atividade
                    </label>
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value as TaskType)}
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {Object.entries(TASK_TYPE_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>
                          {cfg.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                      Título da Ação
                    </label>
                    <input
                      type="text"
                      value={actionTitle}
                      onChange={(e) => setActionTitle(e.target.value)}
                      placeholder="Ex: Ligar para confirmar proposta"
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      required={scheduleNextAction}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                      Data
                    </label>
                    <input
                      type="date"
                      value={actionDate}
                      onChange={(e) => setActionDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      required={scheduleNextAction}
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
                      required={scheduleNextAction}
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Instruções para o retorno (opcional)"
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
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
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Movimentação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
