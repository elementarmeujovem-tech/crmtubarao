import React, { useState } from 'react';
import { 
  SavedEvent, 
  EVENT_CATEGORIES_CONFIG, 
  VERIFICATION_STATUS_CONFIG 
} from '../../types';
import { getGoogleCalendarUrl } from '../../utils/calendarSync';
import { 
  X, 
  CalendarDays, 
  Clock, 
  MapPin, 
  Building2, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  CalendarCheck, 
  FileText, 
  AlertTriangle, 
  ArrowRight
} from 'lucide-react';

interface EventDetailModalProps {
  event: SavedEvent;
  onClose: () => void;
  onUpdateEvent: (id: string, updates: Partial<SavedEvent>) => void;
  onOpenAddToPersonalAgenda: (event: SavedEvent) => void;
  onNavigateToPersonalAgenda?: (taskId?: string) => void;
  onRemoveEvent: (id: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onUpdateEvent,
  onOpenAddToPersonalAgenda,
  onNavigateToPersonalAgenda,
  onRemoveEvent,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [commercialNotes, setCommercialNotes] = useState(event.commercialNotes || '');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const categoryConfig = EVENT_CATEGORIES_CONFIG[event.category] || EVENT_CATEGORIES_CONFIG.business;
  const verificationConfig = VERIFICATION_STATUS_CONFIG[event.verificationStatus] || VERIFICATION_STATUS_CONFIG.confirmed;

  const handleSaveNotes = () => {
    onUpdateEvent(event.id, { commercialNotes: commercialNotes.trim() });
    setIsEditingNotes(false);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300';
    if (score >= 60) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300';
    if (score >= 40) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
  };

  const getScorePriorityLabel = (score: number) => {
    if (score >= 80) return 'Alta Prioridade Comercial';
    if (score >= 60) return 'Prioridade Média';
    if (score >= 40) return 'Baixa Prioridade';
    return 'Pouca Aderência';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <CalendarDays className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Registro em Eventos
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {event.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status and Category Ribbon */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${categoryConfig.bg} ${categoryConfig.color} ${categoryConfig.border}`}>
                {categoryConfig.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${verificationConfig.bg} ${verificationConfig.color} ${verificationConfig.border}`}>
                {verificationConfig.label}
              </span>
            </div>

            <span className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${getScoreBadgeColor(event.commercialScore)}`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{event.commercialScore}/100 • {getScorePriorityLabel(event.commercialScore)}</span>
            </span>
          </div>

          {/* Personal Agenda Integration Banner */}
          {event.addedToPersonalAgenda ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-extrabold text-xs">Adicionado à sua agenda pessoal</p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                    O compromisso já está sincronizado com sua rotina de tarefas e retornos.
                  </p>
                </div>
              </div>
              {onNavigateToPersonalAgenda && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToPersonalAgenda(event.personalTaskId);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-sm flex items-center gap-1 shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  <span>Ver na minha agenda</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                  Quer incluir este evento na sua rotina?
                </p>
                <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                  Transfira para a sua agenda pessoal e defina lembretes de preparação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddToPersonalAgenda(event);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Adicionar à minha agenda</span>
              </button>
            </div>
          )}

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Data: <strong className="text-slate-900 dark:text-white">{new Date(`${event.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Horário: <strong className="text-slate-900 dark:text-white">{event.time || 'Não especificado'}</strong></span>
              </div>
            </div>

            {event.venue && (
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300 pt-1">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">{event.venue}</span>
                  {event.city && <span className="text-slate-500"> • {event.city}</span>}
                </div>
              </div>
            )}

            {event.address && (
              <div className="flex items-start gap-2 text-slate-500 text-[11px]">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{event.address}</span>
              </div>
            )}

            {event.organizer && (
              <p className="text-[11px] text-slate-500 pt-1">
                Organizador: <strong className="text-slate-700 dark:text-slate-300">{event.organizer}</strong>
              </p>
            )}

            {event.description && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                {event.description}
              </div>
            )}
          </div>

          {/* Commercial Score Breakdown */}
          {event.scoreReasons && event.scoreReasons.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Motivos da Pontuação Comercial:
              </span>
              <div className="space-y-1 text-[11px]">
                {event.scoreReasons.map((reason, idx) => (
                  <p key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold shrink-0">•</span>
                    <span>{reason}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Commercial Notes (Editable) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-500" />
                <span>Observações Comerciais do Consultor</span>
              </span>
              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Editar</span>
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={commercialNotes}
                  onChange={(e) => setCommercialNotes(e.target.value)}
                  placeholder="Anote detalhes de contatos, estratégia de abordagem..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCommercialNotes(event.commercialNotes || '');
                      setIsEditingNotes(false);
                    }}
                    className="px-3 py-1 rounded-lg text-slate-600 dark:text-slate-400 text-[11px] font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px]"
                  >
                    Salvar Notas
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-600 dark:text-slate-300 italic">
                {event.commercialNotes || 'Nenhuma observação comercial registrada ainda.'}
              </p>
            )}
          </div>

          {/* Original Source Link */}
          {event.originalUrl && (
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Fonte: <strong>{event.source || 'Portal Oficial'}</strong>
              </span>
              <a
                href={event.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <span>Abrir página oficial do evento</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Delete confirmation section */}
          {isConfirmingDelete ? (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Confirmar remoção de Eventos?</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                O evento será removido deste calendário. Caso já tenha sido adicionado à sua agenda pessoal, o compromisso pessoal será mantido.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border text-slate-700 dark:text-slate-300 text-[11px] font-bold"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveEvent(event.id);
                    onClose();
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px]"
                >
                  Sim, Remover
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover de Eventos</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={getGoogleCalendarUrl({
                    title: `[Evento] ${event.title}`,
                    date: event.date,
                    time: event.time || '09:00',
                    description: `${event.description || ''}\n\nLocal: ${event.venue || ''}\nPontuação Comercial: ${event.commercialScore}/100\nLink: ${event.sourceUrl || ''}`,
                    location: event.venue || '',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold text-xs hover:bg-sky-100 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Adicionar diretamente ao seu Google Agenda"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-sky-500" />
                  <span>+ Google Agenda</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
