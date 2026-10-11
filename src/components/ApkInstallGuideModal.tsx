import React from 'react';
import { X, Smartphone, Download, CheckCircle2, ShieldCheck, Share2, PlusSquare } from 'lucide-react';

interface ApkInstallGuideModalProps {
  onClose: () => void;
}

export const ApkInstallGuideModal: React.FC<ApkInstallGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Como Instalar o App no Celular (.APK / PWA)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesso nativo e rápido sem precisar de loja de aplicativos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 space-y-3">
          {/* Android Step */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
            <h3 className="font-bold text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Android (Google Chrome / Samsung Internet)</span>
            </h3>
            <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-decimal pl-4">
              <li>Abra este site no navegador do seu smartphone Android.</li>
              <li>Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito.</li>
              <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
              <li>O ícone do CRM será instalado nativamente com acesso offline automático.</li>
            </ol>
          </div>

          {/* iOS Step */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Share2 className="w-4 h-4 text-sky-500" />
              <span>iPhone / iOS (Safari)</span>
            </h3>
            <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-decimal pl-4">
              <li>Abra o link no navegador <strong>Safari</strong> do iPhone.</li>
              <li>Toque no botão de <strong>Compartilhar (quadrado com seta pra cima)</strong>.</li>
              <li>Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
            </ol>
          </div>

          {/* Key Advantages */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>100% Funcional Offline (funciona sem internet)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Sincronização automática em segundo plano</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
        >
          Entendido, Voltar ao CRM
        </button>
      </div>
    </div>
  );
};
