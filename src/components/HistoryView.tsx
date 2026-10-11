import React, { useState } from 'react';
import { Interaction, Contact, InteractionType } from '../types';
import { 
  History, 
  Search, 
  MessageSquare, 
  PhoneCall, 
  Mail, 
  UserCheck, 
  FileText, 
  Clock, 
  Calendar,
  Building2,
  User
} from 'lucide-react';

interface HistoryViewProps {
  interactions: Interaction[];
  contacts: Contact[];
  onSelectContact: (contact: Contact) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  interactions,
  contacts,
  onSelectContact,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<InteractionType | 'ALL'>('ALL');

  const contactMap = new Map<string, Contact>(contacts.map((c) => [c.id, c]));

  const filteredInteractions = interactions.filter((item) => {
    const contact = contactMap.get(item.contactId);
    const contactName = contact?.name || '';
    const company = contact?.company || '';

    const matchesSearch =
      !searchTerm ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'ALL' || item.type === selectedType;

    return matchesSearch && matchesType;
  });

  const getInteractionIcon = (type: InteractionType) => {
    switch (type) {
      case 'call': return <PhoneCall className="w-4 h-4 text-indigo-500" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'email': return <Mail className="w-4 h-4 text-sky-500" />;
      case 'meeting': return <UserCheck className="w-4 h-4 text-purple-500" />;
      case 'proposal': return <FileText className="w-4 h-4 text-amber-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Search & Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Linha do Tempo de Atendimentos ({filteredInteractions.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Histórico consolidado de todas as ligações, mensagens e reuniões
            </p>
          </div>
        </div>

        {/* Input search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por resumo, cliente ou empresa..."
            className="w-full pl-10 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              selectedType === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Todos Canais
          </button>
          <button
            onClick={() => setSelectedType('whatsapp')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              selectedType === 'whatsapp'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setSelectedType('call')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              selectedType === 'call'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
            }`}
          >
            Ligações
          </button>
          <button
            onClick={() => setSelectedType('meeting')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              selectedType === 'meeting'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
            }`}
          >
            Reuniões
          </button>
          <button
            onClick={() => setSelectedType('proposal')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              selectedType === 'proposal'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            Propostas
          </button>
        </div>
      </div>

      {/* Interactions Feed */}
      <div className="space-y-3">
        {filteredInteractions.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            Nenhum histórico encontrado com estes critérios.
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const contact = contactMap.get(item.contactId);
            const dateStr = new Date(item.date).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                      {getInteractionIcon(item.type)}
                    </div>
                    <div>
                      {contact ? (
                        <button
                          onClick={() => onSelectContact(contact)}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 text-left transition-colors"
                        >
                          {contact.name}
                        </button>
                      ) : (
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Contato Desconhecido
                        </span>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {contact?.company || 'Pessoa Física'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-medium text-slate-400 shrink-0">
                    {dateStr}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 pl-10 leading-relaxed">
                  {item.summary}
                </p>

                {item.nextFollowUp && (
                  <div className="ml-10 mt-2.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Retorno Agendado:{' '}
                      {new Date(item.nextFollowUp).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
