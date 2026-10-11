import React, { useState } from 'react';
import { ExternalEvent, SavedEvent, EVENT_CATEGORIES_CONFIG } from '../../types';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Building2, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

interface AddToEventsModalProps {
  event: ExternalEvent;
  onClose: () => void;
  onConfirm: (savedEventData: Omit<SavedEvent, 'id' | 'savedAt'>) => void;
}

export const AddToEventsModal: React.FC<AddToEventsModalProps> = ({
  event,
  onClose,
  onConfirm,
}) => {
  const [commercialNotes, setCommercialNotes] = useState('');
  const [date, setDate] = useState(event.dateStr || event.startDate.split('T')[0]);
  const [time, setTime] = useState(event.timeStr || '09:00');

  const categoryConfig = EVENT_CATEGORIES_CONFIG[event.category] || EVENT_CATEGORIES_CONFIG.business;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      externalEventId: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      date,
      time,
      venue: event.venueName,
      address: event.address,
      city: event.city,
      organizer: event.organizer,
      originalUrl: event.originalUrl,
      source: event.source,
      commercialScore: event.commercialScore,
      scoreReasons: event.scoreReasons,
      commercialNotes: commercialNotes.trim() || undefined,
      verificationStatus: event.verificationStatus,
      addedToPersonalAgenda: false, // Regra: adicionar a Eventos NÃO adiciona à agenda pessoal
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Adicionar ao Calendário de Eventos
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Salvar oportunidade no calendário exclusivo de Eventos
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
          {/* Informative Rule Notice */}
          <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Regra de separação:</strong> Este evento será salvo no seu calendário de <strong>Eventos</strong>. Ele não será adicionado à sua agenda pessoal até que você confirme explicitamente a inclusão.
            </p>
          </div>

          {/* Event Preview Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${categoryConfig.bg} ${categoryConfig.color} ${categoryConfig.border}`}>
                {categoryConfig.label}
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Potencial: {event.commercialScore}/100
              </span>
            </div>

            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
              {event.title}
            </h4>

            <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px] pt-1">
              {event.venueName && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{event.venueName} {event.city ? `— ${event.city}/${event.state || ''}` : ''}</span>
                </div>
              )}
              {event.address && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{event.address}</span>
                </div>
              )}
              {event.organizer && (
                <p className="text-[10.5px] text-slate-500">
                  Organização: <strong className="text-slate-700 dark:text-slate-300">{event.organizer}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Date and Time confirmation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Data do Evento</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Horário Previsto</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Commercial Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-purple-500" />
              <span>Observações Comerciais (Opcional)</span>
            </label>
            <textarea
              value={commercialNotes}
              onChange={(e) => setCommercialNotes(e.target.value)}
              placeholder="Ex: Focar em captação de clientes para consórcio imobiliário ou parcerias com construtoras..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-slate-400"
            />
          </div>

          {/* Link reminder */}
          {event.originalUrl && (
            <a
              href={event.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>Ver site e ingressos na fonte original ({event.source})</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

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
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Salvar em Eventos</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
