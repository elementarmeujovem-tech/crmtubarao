import React, { useState, useEffect } from 'react';
import { Contact, FunnelStage, STAGE_CONFIG } from '../types';
import { DollarSign, X, Check, TrendingUp, Sparkles, Building2, Tag as TagIcon } from 'lucide-react';

interface EditDealValueModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContact: Contact) => void;
}

export const EditDealValueModal: React.FC<EditDealValueModalProps> = ({
  contact,
  isOpen,
  onClose,
  onSave,
}) => {
  const [valueInput, setValueInput] = useState<string>('');
  const [stage, setStage] = useState<FunnelStage>('contato');
  const [reasonNotes, setReasonNotes] = useState<string>('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  useEffect(() => {
    if (contact) {
      setValueInput(contact.dealValue ? String(contact.dealValue) : '');
      setStage(contact.stage || 'contato');
      setReasonNotes('');
      setIsSavedRecently(false);
    }
  }, [contact, isOpen]);

  if (!isOpen || !contact) return null;

  const numericValue = parseFloat(valueInput) || 0;

  const handleAdjustPercent = (percent: number) => {
    const current = parseFloat(valueInput) || 0;
    const next = Math.max(0, Math.round(current * (1 + percent / 100)));
    setValueInput(String(next));
  };

  const handlePresetValue = (val: number) => {
    setValueInput(String(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;

    const newDealValue = parseFloat(valueInput) || 0;
    const updated: Contact = {
      ...contact,
      dealValue: newDealValue,
      stage,
      notes: reasonNotes.trim() 
        ? `${contact.notes ? `${contact.notes}\n` : ''}[Alteração de Valor para ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newDealValue)}]: ${reasonNotes.trim()}`
        : contact.notes,
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    setIsSavedRecently(true);
    setTimeout(() => {
      setIsSavedRecently(false);
      onClose();
    }, 400);
  };

  const stageConfig = STAGE_CONFIG[stage];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-slate-50 to-indigo-500/10 dark:from-emerald-950/30 dark:via-slate-900 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Oportunidade Comercial
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                  {stageConfig.label}
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-[240px]">
                {contact.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead Context Pill */}
        <div className="px-5 pt-3 pb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{contact.company || 'Pessoa Física'}</span>
            {contact.phone && <span className="text-slate-400">• {contact.phone}</span>}
          </div>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
            Atual: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue || 0)}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Main Deal Value Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Valor Estimado da Oportunidade
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                placeholder="0,00"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-lg font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                required
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>Valor por extenso:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue)}
              </span>
            </div>
          </div>

          {/* Quick Percentage Adjustments */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Ajuste Rápido de Margem / Proposta:
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: '+10%', val: 10, positive: true },
                { label: '+25%', val: 25, positive: true },
                { label: '+50%', val: 50, positive: true },
                { label: '-10%', val: -10, positive: false },
                { label: '-20%', val: -20, positive: false },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => handleAdjustPercent(btn.val)}
                  className={`py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer active:scale-95 ${
                    btn.positive
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Values */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Valores Típicos Comerciais:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[5000, 15000, 30000, 50000, 100000, 200000, 350000, 500000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetValue(preset)}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer active:scale-95 truncate ${
                    numericValue === preset
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {preset >= 1000000
                    ? `R$ ${preset / 1000000}M`
                    : preset >= 1000
                    ? `R$ ${preset / 1000}k`
                    : `R$ ${preset}`}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Stage Adjustment */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Etapa no Funil:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['contato', 'prospeccao', 'proposta', 'perdido'] as FunnelStage[]).map((stgKey) => {
                const cfg = STAGE_CONFIG[stgKey];
                const isSelected = stage === stgKey;
                return (
                  <button
                    key={stgKey}
                    type="button"
                    onClick={() => setStage(stgKey)}
                    className={`py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isSelected
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-indigo-500 font-black shadow-xs`
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Observação sobre a mudança de valor (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Cliente solicitou upgrade de cota..."
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                isSavedRecently
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSavedRecently ? 'Salvo!' : 'Salvar Novo Valor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
