import React, { useState, useRef, useMemo } from 'react';
import { Contact, Tag, FunnelStage, STAGE_CONFIG } from '../types';
import { 
  parseContactsCsv, 
  convertCsvRowsToContacts, 
  ParseCsvResult,
  exportContactsToCsv
} from '../utils/csvParser';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Eye, 
  Layers, 
  Tag as TagIcon, 
  Users, 
  Phone, 
  Building2, 
  Mail, 
  Filter, 
  FileText,
  RefreshCw,
  HelpCircle,
  FileDown
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingContacts: Contact[];
  existingTags: Tag[];
  onImportSuccess: (
    contacts: Contact[], 
    newTags: Tag[], 
    mode: 'merge' | 'replace' | 'skip_existing'
  ) => { addedCount: number; updatedCount: number; skippedCount: number };
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingContacts,
  existingTags,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input state
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');

  // Configuration options
  const [stageMode, setStageMode] = useState<FunnelStage | 'auto'>('auto');
  const [createOriginTags, setCreateOriginTags] = useState<boolean>(true);
  const [createClassTags, setCreateClassTags] = useState<boolean>(true);
  const [dedupMode, setDedupMode] = useState<'merge' | 'skip_existing' | 'replace'>('merge');

  // Import process state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
    skipped: number;
    total: number;
    newTagsCount: number;
  } | null>(null);

  // Parse CSV whenever text changes
  const parsedData: ParseCsvResult = useMemo(() => {
    if (!csvRawText.trim()) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        validContactsCount: 0,
        samplePreview: [],
        detectedColumns: {
          nameIndex: -1,
          phoneIndex: -1,
          companyIndex: -1,
          originIndex: -1,
          emailIndex: -1,
          classificationIndex: -1,
          dateIndex: -1,
          numberIndex: -1,
        },
      };
    }
    return parseContactsCsv(csvRawText);
  }, [csvRawText]);

  if (!isOpen) return null;

  // File Handlers
  const handleFileSelect = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvRawText(text || '');
      setImportResult(null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (parsedData.rows.length === 0) return;

    setIsProcessing(true);

    try {
      const { contacts: convertedContacts, newTags } = convertCsvRowsToContacts(
        parsedData.rows,
        existingTags,
        {
          defaultStage: stageMode,
          createOriginTags,
          createClassificationTags: createClassTags,
        }
      );

      const res = onImportSuccess(convertedContacts, newTags, dedupMode);

      setImportResult({
        added: res.addedCount,
        updated: res.updatedCount,
        skipped: res.skippedCount,
        total: parsedData.rows.length,
        newTagsCount: newTags.length,
      });
    } catch (err) {
      console.error('Error importing CSV:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download empty model CSV template
  const handleDownloadTemplate = () => {
    const templateContent = `"N°","Nome","Celular","Empresa","Origem","E-mail","Classificações","Data cadastro","Ações"\n"1","Exemplo Contato","5511999998888","Empresa Modelo","WhatsApp","contato@empresa.com","Lead","28/08/2026",""`;
    const blob = new Blob(['\ufeff' + templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `modelo_importacao_contatos.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export current contacts in this exact CSV column layout
  const handleExportCurrentContacts = () => {
    const csvContent = exportContactsToCsv(existingContacts, existingTags);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contatos_crm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800"
        style={{
          marginTop: 'max(calc(env(safe-area-inset-top, 0px) + 0.5rem), 0.5rem)',
          marginBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 0.5rem), 0.5rem)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Importar Contatos via CSV</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Colunas Específicas
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Suporta: N°, Nome, Celular, Empresa, Origem, E-mail, Classificações e Data cadastro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              title="Baixar planilha modelo vazia"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Baixar Modelo</span>
            </button>

            {existingContacts.length > 0 && (
              <button
                onClick={handleExportCurrentContacts}
                title="Exportar base atual no mesmo formato CSV"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Base</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Import Modes Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Enviar Arquivo (.csv)</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Colar Texto CSV</span>
            </button>
          </div>

          {/* File Upload Area */}
          {activeTab === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {fileName ? `Arquivo selecionado: ${fileName}` : 'Clique para selecionar ou arraste seu arquivo CSV'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Suporta codificação UTF-8, delimitadores de vírgula (,) e ponto-e-vírgula (;)
              </p>
            </div>
          )}

          {/* Direct CSV Text Area */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Cole o conteúdo do CSV (incluindo ou não o cabeçalho):
              </label>
              <textarea
                value={csvRawText}
                onChange={(e) => {
                  setCsvRawText(e.target.value);
                  setImportResult(null);
                }}
                rows={5}
                placeholder={`"N°","Nome","Celular","Empresa","Origem","E-mail","Classificações","Data cadastro","Ações"\n"1","Mariana Silva","5511987654321","Alpha Tech","WhatsApp","mariana@alphatech.com","Lead","28/08/2026",""`}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
          )}

          {/* Detection & Parsed Data Summary */}
          {parsedData.rows.length > 0 && (
            <div className="space-y-4">
              {/* Columns Detected Indicator */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Colunas Identificadas com Sucesso:</span>
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {parsedData.totalRows} contatos encontrados
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Nome do Contato</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {parsedData.detectedColumns.nameIndex !== -1 ? 'Identificado ✓' : 'Não encontrado'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Celular / WhatsApp</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {parsedData.detectedColumns.phoneIndex !== -1 ? 'Identificado ✓' : 'Não encontrado'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Origem (Canal)</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {parsedData.detectedColumns.originIndex !== -1 ? 'Identificado ✓' : 'Não encontrado'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Classificação</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {parsedData.detectedColumns.classificationIndex !== -1 ? 'Identificado ✓' : 'Não encontrado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Import Configuration Settings */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Opções de Importação & Funil</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Funnel Stage Destination */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Destino no Funil:
                    </label>
                    <select
                      value={stageMode}
                      onChange={(e) => setStageMode(e.target.value as FunnelStage | 'auto')}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      <option value="auto">Automático por Classificação (Lead=Frio, Prospect=Vivo, Cliente=Quente)</option>
                      <option value="contato">Todos para Frio (Lead)</option>
                      <option value="prospeccao">Todos para Vivo (Prospect)</option>
                      <option value="proposta">Todos para Quente (Cliente / Proposta)</option>
                      <option value="perdido">Todos para Clientes</option>
                    </select>
                  </div>

                  {/* Duplicate Handling */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Tratamento de Contatos Existentes:
                    </label>
                    <select
                      value={dedupMode}
                      onChange={(e) => setDedupMode(e.target.value as 'merge' | 'skip_existing' | 'replace')}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                      <option value="merge">Atualizar e Mesclar (se telefone já existir)</option>
                      <option value="skip_existing">Pular e Manter os Atuais (ignora repetidos)</option>
                      <option value="replace">Substituir toda a base pelos contatos do CSV</option>
                    </select>
                  </div>
                </div>

                {/* Auto Tag Toggles */}
                <div className="flex flex-wrap gap-4 pt-1 border-t border-indigo-100 dark:border-indigo-900/40 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createOriginTags}
                      onChange={(e) => setCreateOriginTags(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Criar etiquetas automáticas de <strong className="text-indigo-600 dark:text-indigo-400">Origem</strong> (ex: TikTok, Facebook, Indicação)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createClassTags}
                      onChange={(e) => setCreateClassTags(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Criar etiquetas de <strong className="text-amber-600 dark:text-amber-400">Classificação</strong> (ex: Lead, Cliente, Prospect)
                    </span>
                  </label>
                </div>
              </div>

              {/* Sample Preview Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Prévia dos Primeiros Contatos ({Math.min(10, parsedData.rows.length)} de {parsedData.totalRows}):</span>
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase sticky top-0">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Nome</th>
                        <th className="py-2 px-3">Celular</th>
                        <th className="py-2 px-3">Origem</th>
                        <th className="py-2 px-3">Classificação</th>
                        <th className="py-2 px-3">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {parsedData.samplePreview.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{row.indexNumber || idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{row.name}</td>
                          <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{row.phone}</td>
                          <td className="py-2 px-3">
                            {row.origin ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 whitespace-nowrap">
                                {row.origin}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {row.classification ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 whitespace-nowrap">
                                {row.classification}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400 text-[11px] whitespace-nowrap">{row.registrationDate || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 animate-fadeIn space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Importação Concluída com Sucesso!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Novos Adicionados:</span>
                  <strong className="text-emerald-700 dark:text-emerald-300 text-sm">{importResult.added}</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Atualizados/Mesclados:</span>
                  <strong className="text-indigo-700 dark:text-indigo-300 text-sm">{importResult.updated}</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Ignorados/Repetidos:</span>
                  <strong className="text-slate-600 dark:text-slate-400 text-sm">{importResult.skipped}</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Etiquetas Criadas:</span>
                  <strong className="text-amber-700 dark:text-amber-300 text-sm">{importResult.newTagsCount}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {importResult ? 'Fechar' : 'Cancelar'}
          </button>

          <div className="flex items-center gap-2">
            {importResult ? (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ver Contatos Importados</span>
              </button>
            ) : (
              <button
                onClick={handleExecuteImport}
                disabled={parsedData.rows.length === 0 || isProcessing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando Importação...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Importar {parsedData.totalRows > 0 ? `${parsedData.totalRows} Contatos` : ''}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
