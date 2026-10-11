import React, { useState, useRef, useEffect } from 'react';
import { SyncState, PendingSyncItem } from '../types';
import { 
  X, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  FileJson,
  Clock,
  Layers,
  AlertTriangle,
  FileUp,
  Database,
  Trash2,
  Calendar
} from 'lucide-react';
import { 
  signInWithGoogleCalendar, 
  getConnectedGoogleUser, 
  signOutGoogleCalendar, 
  syncAllTasksToGoogleCalendar, 
  getGoogleAccessToken 
} from '../services/googleCalendarSync';
import { storageService } from '../services/storage';

interface SyncSettingsModalProps {
  syncState: SyncState;
  pendingQueue: PendingSyncItem[];
  onClose: () => void;
  onManualSync: () => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => boolean;
  onResetDemoData: () => void;
  onClearAllContacts?: () => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  syncState,
  pendingQueue,
  onClose,
  onManualSync,
  onExportBackup,
  onImportBackup,
  onResetDemoData,
  onClearAllContacts,
}) => {
  const [isProcessingSync, setIsProcessingSync] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Google Calendar Auth & Sync state
  const [googleUser, setGoogleUser] = useState(getConnectedGoogleUser());
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleSyncMsg, setGoogleSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setGoogleUser(getConnectedGoogleUser());
  }, []);

  const handleGoogleConnect = async () => {
    setIsGoogleLoading(true);
    setGoogleSyncMsg(null);
    try {
      const res = await signInWithGoogleCalendar();
      setGoogleUser(res.user);
      setGoogleSyncMsg({ type: 'success', text: `Conectado com sucesso à conta ${res.user.email}!` });
    } catch (err: any) {
      setGoogleSyncMsg({ type: 'error', text: err?.message || 'Falha ao autenticar com o Google Calendar.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    await signOutGoogleCalendar();
    setGoogleUser(null);
    setGoogleSyncMsg({ type: 'success', text: 'Conta do Google Agenda desconectada.' });
  };

  const handleSyncToGoogleCalendar = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      setGoogleSyncMsg({ type: 'error', text: 'Conecte sua conta Google primeiro.' });
      return;
    }

    setIsGoogleLoading(true);
    setGoogleSyncMsg(null);
    try {
      const tasks = storageService.getTasks({ status: 'upcoming' }).concat(storageService.getTasks({ status: 'today' }));
      if (tasks.length === 0) {
        setGoogleSyncMsg({ type: 'error', text: 'Não há tarefas ou retornos pendentes para sincronizar.' });
        setIsGoogleLoading(false);
        return;
      }

      const result = await syncAllTasksToGoogleCalendar(tasks);
      if (result.syncedCount > 0) {
        setGoogleSyncMsg({ 
          type: 'success', 
          text: `${result.syncedCount} tarefa(s) sincronizada(s) com sucesso para o Google Agenda!` 
        });
      } else {
        setGoogleSyncMsg({ type: 'error', text: 'Nenhuma tarefa nova foi sincronizada. Verifique os erros: ' + (result.errors[0] || '') });
      }
    } catch (err: any) {
      setGoogleSyncMsg({ type: 'error', text: err?.message || 'Erro ao sincronizar com o Google Calendar.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSyncClick = async () => {
    setIsProcessingSync(true);
    setSyncFeedback(null);
    try {
      await onManualSync();
      setSyncFeedback('Sincronização concluída com sucesso!');
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (e) {
      setSyncFeedback('Falha na sincronização. Tente novamente.');
    } finally {
      setIsProcessingSync(false);
    }
  };

  const handleFileProcess = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setImportStatus({ type: 'error', text: 'Por favor, selecione um arquivo válido .json de backup.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const ok = onImportBackup(content);
      if (ok) {
        setImportStatus({ type: 'success', text: `Arquivo "${file.name}" importado e restaurado com sucesso!` });
        setImportText('');
      } else {
        setImportStatus({ type: 'error', text: 'Estrutura do arquivo JSON inválida para este CRM.' });
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    const ok = onImportBackup(importText.trim());
    if (ok) {
      setImportStatus({ type: 'success', text: 'Backup em texto JSON importado e restaurado com sucesso!' });
      setImportText('');
    } else {
      setImportStatus({ type: 'error', text: 'Erro: Estrutura JSON inválida ou corrompida.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Hidden JSON file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".json,application/json"
          className="hidden"
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sincronização & Modo Offline
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arquitetura Offline-First com backup local e em nuvem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Device Cloud Sync Card */}
        <div className="mb-4 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs font-black text-indigo-900 dark:text-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Sincronização Multi-Dispositivos Ativa</span>
          </div>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            Ao instalar o aplicativo em outros celulares ou computadores, todos os seus logins, cadastros de equipe, contatos e negociações sincronizam <strong>automaticamente em tempo real</strong> pelo servidor central.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Mesmo login em vários celulares
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Fila offline com auto-envio
            </span>
          </div>
        </div>

        {/* Google Calendar Integration Card */}
        <div className="mb-4 p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-sky-900 dark:text-sky-200">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Integração com Google Agenda (Google Calendar)</span>
            </div>
            {googleUser ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                Conectado
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                Não Conectado
              </span>
            )}
          </div>
          
          <p className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
            {googleUser ? (
              <>Conta vinculada: <strong>{googleUser.email}</strong>. Suas tarefas e retornos podem ser sincronizados diretamente com seu Google Agenda.</>
            ) : (
              <>Vincule seu e-mail do Google para sincronizar reuniões, compromissos e retornos comerciais diretamente com sua agenda principal.</>
            )}
          </p>

          {googleSyncMsg && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              googleSyncMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-700 dark:text-rose-300'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{googleSyncMsg.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {googleUser ? (
              <>
                <button
                  type="button"
                  onClick={handleSyncToGoogleCalendar}
                  disabled={isGoogleLoading}
                  className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGoogleLoading ? 'animate-spin' : ''}`} />
                  <span>{isGoogleLoading ? 'Sincronizando...' : 'Sincronizar Tarefas com Google Agenda'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleDisconnect}
                  disabled={isGoogleLoading}
                  className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Desconectar Conta
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGoogleConnect}
                disabled={isGoogleLoading}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{isGoogleLoading ? 'Conectando...' : 'Vincular com Google Agenda (E-mail)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {syncState.isOnline ? (
                <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Wifi className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shrink-0">
                  <WifiOff className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {syncState.isOnline ? 'Online (Conectado)' : 'Modo Offline Ativo'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    syncState.isOnline 
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                  }`}>
                    {syncState.isOnline ? 'Nuvem Ativa' : 'Sem Internet'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {syncState.isOnline
                    ? 'Todas as alterações são replicadas instantaneamente.'
                    : 'Você pode continuar cadastrando contatos e notas normalmente. Os dados serão sincronizados automaticamente assim que a conexão retornar.'}
                </p>
              </div>
            </div>
          </div>

          {/* Sync Trigger & Queue Details */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Fila de Pendências:{' '}
                  <strong className={pendingQueue.length > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                    {pendingQueue.length} {pendingQueue.length === 1 ? 'item' : 'itens'}
                  </strong>
                </span>
              </div>
              {syncState.lastSyncTime && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>Última sincronização: {new Date(syncState.lastSyncTime).toLocaleTimeString('pt-BR')}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSyncClick}
              disabled={isProcessingSync || !syncState.isOnline}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessingSync ? 'animate-spin' : ''}`} />
              <span>{isProcessingSync ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>

          {/* Instant feedback notification */}
          {syncFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>

        {/* Backup Export / Import & Management */}
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>Cópia de Segurança & Restauração</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export Button */}
            <button
              onClick={onExportBackup}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-left transition-all flex flex-col gap-2 group cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 w-fit group-hover:scale-105 transition-transform">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs">Exportar Backup (.JSON)</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Baixe todos os contatos, etiquetas e histórico no seu dispositivo
                </p>
              </div>
            </button>

            {/* Direct File Picker Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-left transition-all flex flex-col gap-2 group cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 w-fit group-hover:scale-105 transition-transform">
                <FileUp className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs">Importar Arquivo JSON</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Selecione um arquivo de backup para restaurar seus dados
                </p>
              </div>
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-3.5 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/40 dark:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <FileJson className="w-4 h-4 text-indigo-500" />
              <span>Arraste ou clique para carregar o arquivo .json de backup</span>
            </div>
          </div>

          {/* Import Feedback */}
          {importStatus && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              importStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
            }`}>
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{importStatus.text}</span>
            </div>
          )}

          {/* Paste JSON Fallback */}
          <form onSubmit={handleImportSubmit} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Ou cole o código JSON do backup
            </label>
            <textarea
              rows={2}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"version": "1.0", "contacts": [...]}'
              className="w-full p-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!importText.trim()}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurar Texto JSON</span>
            </button>
          </form>

          {/* Reset Demo Data with Inline Safe Confirmation */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {onClearAllContacts && (
              <div>
                {isConfirmingClear ? (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-xs text-rose-700 dark:text-rose-300 font-semibold text-center sm:text-left">
                      Apagar todos os leads e interações da base?
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onClearAllContacts();
                          setIsConfirmingClear(false);
                          setImportStatus({ type: 'success', text: 'Base de leads limpa com sucesso!' });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Sim, Limpar Base</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClear(false)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClear(true)}
                    className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Zerar / Limpar Todos os Leads da Base</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Persistência local segura ativa</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

