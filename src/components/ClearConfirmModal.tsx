import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface ClearConfirmModalProps {
  isOpen: boolean;
  totalContacts: number;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const ClearConfirmModal: React.FC<ClearConfirmModalProps> = ({
  isOpen,
  totalContacts,
  onClose,
  onConfirm,
}) => {
  const [isClearing, setIsClearing] = useState(false);
  const [clearedSuccess, setClearedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExecuteClear = async () => {
    setIsClearing(true);
    try {
      await onConfirm();
      setClearedSuccess(true);
      setTimeout(() => {
        setIsClearing(false);
        setClearedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error clearing database:', err);
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Limpar Base de Leads
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Remover todos os contatos do CRM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isClearing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 text-xs leading-relaxed space-y-2">
            <div className="flex items-start gap-2.5 font-bold text-sm text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>Atenção: Esta ação é irreversível</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              Você está prestes a remover <strong className="font-bold text-rose-600 dark:text-rose-400">{totalContacts} contato(s)</strong> e todo o histórico de interações registrado.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Sua base ficará completamente limpa para você cadastrar novos leads ou importar sua própria planilha CSV.
            </p>
          </div>

          {clearedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Base limpa com sucesso!</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isClearing}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecuteClear}
            disabled={isClearing || clearedSuccess}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            {isClearing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Limpando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Sim, Limpar Todos os Leads</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
