import React, { useState, useEffect } from 'react';
import { Contact, Task, TaskType } from '../types';
import { toLocalDateString } from '../utils/calendarSync';
import { Calendar, Clock, X, CheckCircle2, User, PhoneCall, Building2, Tag as TagIcon, Trash2 } from 'lucide-react';

export interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  contact: Contact | null;
  task?: Task | null;
  onClose: () => void;
  onSave: (data: {
    contactId: string;
    followUpLabel: string;
    date: string;
    time: string;
    isoDateTime: string;
    notes?: string;
    taskId?: string;
  }) => void;
  onRemove?: (taskId?: string, contactId?: string) => void;
}

const COMMON_CHIPS = [
  'Sem Ação Definida',
  '1º Contato',
  '2º Contato',
  '3º Contato',
  'Entrevista',
  'Retorno Pendente',
  'Reunião Agendada',
  'Apresentação de Proposta',
  'Aguardando Resposta',
  'Follow-up Fechamento',
];

const TIME_SHORTCUTS = ['09:00', '10:30', '14:00', '15:30', '17:00'];

export const ScheduleFollowUpModal: React.FC<ScheduleFollowUpModalProps> = ({
  isOpen,
  contact,
  task,
  onClose,
  onSave,
  onRemove,
}) => {
  const [followUpLabel, setFollowUpLabel] = useState<string>('2º Contato');
  const [dateInput, setDateInput] = useState<string>('');
  const [timeInput, setTimeInput] = useState<string>('14:00');
  const [notesInput, setNotesInput] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      setFollowUpLabel(task.reason || task.title || 'Retorno Agendado');
      setDateInput(task.date || toLocalDateString(new Date()));
      setTimeInput(task.time || '14:00');
      setNotesInput(task.notes || '');
    } else if (contact?.nextFollowUpDate) {
      setFollowUpLabel(contact.followUpLabel || '2º Contato');
      const refDate = new Date(contact.nextFollowUpDate);
      if (!isNaN(refDate.getTime())) {
        setDateInput(toLocalDateString(refDate));
        const hours = String(refDate.getHours()).padStart(2, '0');
        const minutes = String(refDate.getMinutes()).padStart(2, '0');
        setTimeInput(`${hours}:${minutes}`);
      } else {
        setDateInput(toLocalDateString(new Date()));
        setTimeInput('14:00');
      }
      setNotesInput('');
    } else {
      setFollowUpLabel('2º Contato');
      setDateInput(toLocalDateString(new Date()));
      setTimeInput('14:00');
      setNotesInput('');
    }
  }, [isOpen, contact, task]);

  if (!isOpen) return null;

  const applyPresetSchedule = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    setDateInput(toLocalDateString(target));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact && !task) return;

    const contactId = contact?.id || task?.contactId || '';
    const dateToUse = dateInput || toLocalDateString(new Date());
    const timeToUse = timeInput || '14:00';

    let isoDateString = '';
    const dateTimeStr = `${dateToUse}T${timeToUse}:00`;
    const parsed = new Date(dateTimeStr);
    if (!isNaN(parsed.getTime())) {
      isoDateString = parsed.toISOString();
    } else {
      isoDateString = new Date().toISOString();
    }

    onSave({
      contactId,
      followUpLabel: followUpLabel.trim() || 'Retorno Agendado',
      date: dateToUse,
      time: timeToUse,
      isoDateTime: isoDateString,
      notes: notesInput.trim() || undefined,
      taskId: task?.id,
    });

    onClose();
  };

  const displayName = contact?.name || task?.contactName || 'Lead';
  const displayPhone = contact?.phone || task?.contactPhone || '';
  const displayCompany = contact?.company || task?.company || '';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-900 text-white rounded-3xl p-5 shadow-2xl border border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Agendar Retorno & Follow-Up
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[250px]">
                {displayName} {displayPhone ? `• ${displayPhone}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead Info Pill */}
        {(displayCompany || displayPhone) && (
          <div className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2 text-xs text-slate-300 flex-wrap">
            <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-bold text-white">{displayName}</span>
            {displayCompany && (
              <>
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Building2 className="w-3 h-3" />
                  {displayCompany}
                </span>
              </>
            )}
            {displayPhone && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">📞 {displayPhone}</span>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ETIQUETA DE FOLLOW-UP */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black text-rose-400 uppercase tracking-wider">
              ETIQUETA DE FOLLOW-UP (EX: 2º CONTATO)
            </label>
            
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CHIPS.map((chip) => {
                const isSel = followUpLabel === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setFollowUpLabel(chip)}
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
              value={followUpLabel}
              onChange={(e) => setFollowUpLabel(e.target.value)}
              placeholder="Ex: 1º Contato, 2º Contato, Reunião de Fechamento..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
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
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                HORÁRIO DO RETORNO
              </label>
              <input
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
          </div>

          {/* ATALHOS DE DATA */}
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              ATALHOS DE DATA:
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => applyPresetSchedule(0)}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors text-center cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => applyPresetSchedule(1)}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors text-center cursor-pointer"
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => applyPresetSchedule(2)}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors text-center cursor-pointer"
              >
                Em 2 dias
              </button>
              <button
                type="button"
                onClick={() => applyPresetSchedule(3)}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors text-center cursor-pointer"
              >
                Em 3 dias
              </button>
              <button
                type="button"
                onClick={() => applyPresetSchedule(7)}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors text-center cursor-pointer"
              >
                Próx. sem.
              </button>
            </div>
          </div>

          {/* ATALHOS DE HORÁRIO */}
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              ATALHOS DE HORÁRIO:
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {TIME_SHORTCUTS.map((timeStr) => (
                <button
                  key={timeStr}
                  type="button"
                  onClick={() => setTimeInput(timeStr)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors text-center cursor-pointer ${
                    timeInput === timeStr
                      ? 'bg-rose-600 text-white border-rose-500 font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {timeStr}
                </button>
              ))}
            </div>
          </div>

          {/* Observações / Anotações */}
          <div>
            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
              OBSERVAÇÕES DO RETORNO (OPCIONAL)
            </label>
            <textarea
              rows={2}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Ex: Cliente pediu para ligar após a reunião de diretoria..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800 flex-wrap">
            {(task || contact?.nextFollowUpDate) && onRemove ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja remover o agendamento deste lead?')) {
                    onRemove(task?.id, contact?.id || task?.contactId);
                    onClose();
                  }
                }}
                className="px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Agendamento</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Agendamento</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
