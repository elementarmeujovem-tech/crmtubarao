import React, { useState, useMemo } from 'react';
import { SavedEvent, Task, User, EVENT_CATEGORIES_CONFIG } from '../../types';
import { 
  X, 
  CalendarDays, 
  Clock, 
  MapPin, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText,
  Building2
} from 'lucide-react';

interface AddToPersonalAgendaModalProps {
  event: SavedEvent;
  currentUser: User | null;
  users: User[];
  conflictingTasks: Task[];
  onClose: () => void;
  onConfirm: (data: {
    personalNotes?: string;
    assignedTo?: string;
    targetDate: string;
    targetTime: string;
  }) => void;
}

export const AddToPersonalAgendaModal: React.FC<AddToPersonalAgendaModalProps> = ({
  event,
  currentUser,
  users,
  conflictingTasks,
  onClose,
  onConfirm,
}) => {
  const [targetDate, setTargetDate] = useState(event.date);
  const [targetTime, setTargetTime] = useState(event.time || '09:00');
  const [assignedTo, setAssignedTo] = useState(currentUser?.name || 'Você (Consultor)');
  const [personalNotes, setPersonalNotes] = useState(event.commercialNotes || '');

  const categoryConfig = EVENT_CATEGORIES_CONFIG[event.category] || EVENT_CATEGORIES_CONFIG.business;

  // Filter conflicts for selected date and approximate time
  const currentConflicts = useMemo(() => {
    return conflictingTasks.filter(t => {
      if (t.completed) return false;
      if (t.date !== targetDate) return false;
      if (targetTime && t.time) {
        const h1 = parseInt(targetTime.split(':')[0], 10);
        const h2 = parseInt(t.time.split(':')[0], 10);
        return Math.abs(h1 - h2) <= 1; // within 1 hour
      }
      return true;
    });
  }, [conflictingTasks, targetDate, targetTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      personalNotes: personalNotes.trim() || undefined,
      assignedTo,
      targetDate,
      targetTime,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-indigo-50/60 dark:bg-indigo-950/40">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600 text-white">
              <CalendarDays className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Adicionar à Minha Agenda Pessoal
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Criar compromisso comercial com vínculo direto ao evento
              </p>
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Conflict Warning (Non-blocking) */}
          {currentConflicts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Atenção: Conflito de Horário Detectado</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Você já possui {currentConflicts.length} compromisso(s) agendado(s) próximo a esse horário:
              </p>
              <ul className="list-disc list-inside text-[10.5px] space-y-0.5 opacity-90 pl-1">
                {currentConflicts.slice(0, 3).map(c => (
                  <li key={c.id} className="truncate">
                    <strong>{c.time || 'Sem hora'}:</strong> {c.title}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 italic">
                * A inclusão não é bloqueada, mas você pode ajustar a data ou horário abaixo caso deseje.
              </p>
            </div>
          )}

          {/* Event Summary Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${categoryConfig.bg} ${categoryConfig.color} ${categoryConfig.border}`}>
                {categoryConfig.label}
              </span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                Score: {event.commercialScore}/100
              </span>
            </div>

            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
              {event.title}
            </h4>

            {event.venue && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{event.venue} {event.city ? `• ${event.city}` : ''}</span>
              </p>
            )}
          </div>

          {/* Date & Time Confirmation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                <span>Data do Compromisso</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Horário na Minha Agenda</span>
              </label>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Assigned Consultant */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Consultor Responsável</span>
            </label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Nome do consultor"
              required
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Personal Preparation Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Observações Pessoais & Metas do Evento</span>
            </label>
            <textarea
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              placeholder="Ex: Levar 50 cartões de visita, abordar estandes do setor imobiliário, agendar 3 reuniões..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Inclusão na Minha Agenda</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
