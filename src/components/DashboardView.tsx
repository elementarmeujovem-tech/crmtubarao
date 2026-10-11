import React, { useMemo } from 'react';
import { 
  Contact, 
  Tag, 
  Interaction, 
  FunnelStage, 
  STAGE_CONFIG 
} from '../types';
import { getWhatsAppUrl } from '../utils/whatsapp';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  ArrowUpRight,
  Target,
  Flame,
  Zap,
  Snowflake,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Edit3,
  CalendarDays,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  ListTodo,
  Swords
} from 'lucide-react';
import { aiAdvisorService } from '../services/aiAdvisor';
import { Task } from '../types';

interface DashboardViewProps {
  contacts: Contact[];
  tags: Tag[];
  interactions: Interaction[];
  tasks?: Task[];
  onSelectContact: (contact: Contact) => void;
  onEditContact?: (contact: Contact) => void;
  onNavigateToFunnel: () => void;
  onNavigateToAgenda?: () => void;
  onNavigateToWarZone?: () => void;
}

const TAG_COLOR_HEX_MAP: Record<string, string> = {
  rose: '#f43f5e',
  amber: '#f59e0b',
  indigo: '#6366f1',
  emerald: '#10b981',
  sky: '#0284c7',
  purple: '#a855f7',
  teal: '#14b8a6',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  contacts,
  tags,
  interactions,
  tasks = [],
  onSelectContact,
  onEditContact,
  onNavigateToFunnel,
  onNavigateToAgenda,
  onNavigateToWarZone,
}) => {
  // Compute Key Metrics
  const totalContacts = contacts.length;
  const clientContacts = contacts.filter((c) => c.stage === 'perdido');
  const clientsValue = clientContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);

  const approachedSet = useMemo(() => new Set(
    interactions
      .filter((i) => ['call', 'whatsapp', 'email', 'meeting', 'response_logged', 'first_approach', 'proposal'].includes(i.type))
      .map((i) => i.contactId)
  ), [interactions]);

  const warZonePendingCount = useMemo(() => {
    const pendingTaskContactIds = new Set(tasks.filter((t) => !t.completed && t.contactId).map((t) => t.contactId));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return contacts.filter((c) => {
      if (c.discardReason) return false;
      if (c.temperature === 'descartado') return false;
      if (c.stage === 'perdido') return false;

      const hasPendingTask = pendingTaskContactIds.has(c.id);
      const hasFollowUp = c.nextFollowUpDate && new Date(c.nextFollowUpDate).getTime() >= todayStart.getTime();
      if (hasPendingTask || hasFollowUp) {
        return false;
      }
      return true;
    }).length;
  }, [contacts, tasks]);

  const activeContacts = contacts.filter((c) => c.stage !== 'perdido');
  const totalPipelineValue = activeContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);

  const hotContacts = contacts.filter((c) => c.stage === 'proposta');
  const hotValue = hotContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);

  const conversionRate = totalContacts > 0 
    ? Math.round((clientContacts.length / totalContacts) * 100) 
    : 0;

  const totalValueAll = contacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const averageTicket = totalContacts > 0 
    ? Math.round(totalValueAll / totalContacts) 
    : 0;

  // Commercial Indicators
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split('T')[0];

  const leadsParados = activeContacts.filter((c) => {
    if (!c.lastInteractionDate) return true;
    return new Date(c.lastInteractionDate).getTime() < threeDaysAgo.getTime();
  }).length;

  const retornosPendentes = tasks.filter(
    (t) => !t.completed && (t.type === 'return' || t.type === 'follow_up')
  ).length;

  const contatosRealizados = interactions.filter(
    (i) => ['call', 'whatsapp', 'meeting', 'proposal', 'contact'].includes(i.type)
  ).length;

  const respostasRecebidas = interactions.filter(
    (i) => i.type === 'response_logged' || Boolean(i.responseType)
  ).length;

  const avancos = interactions.filter(
    (i) => i.type === 'stage_change' && i.newStage && ['prospeccao', 'proposta', 'perdido'].includes(i.newStage)
  ).length;

  const vendas = clientContacts.length;

  const semProximaAcao = activeContacts.filter((c) => {
    const hasPending = tasks.some((t) => t.contactId === c.id && !t.completed);
    return !hasPending && !c.nextFollowUpDate;
  }).length;

  const tarefasVencidas = tasks.filter((t) => {
    if (t.completed) return false;
    const dueDate = new Date(t.dueDateTime);
    return dueDate.getTime() < now.getTime() && t.date < todayStr;
  }).length;

  const todayInteractions = interactions.filter(
    (i) => i.date.split('T')[0] === todayStr
  ).length;

  // Recharts Stage Data
  const stageOrder: FunnelStage[] = [
    'contato',
    'prospeccao',
    'proposta',
    'perdido',
  ];

  const funnelChartData = stageOrder.map((stage) => {
    const stageContacts = contacts.filter((c) => c.stage === stage);
    const value = stageContacts.reduce((sum, c) => sum + (c.dealValue || 0), 0);
    return {
      stageKey: stage,
      nome: STAGE_CONFIG[stage].label,
      quantidade: stageContacts.length,
      valor: value,
      valorFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
    };
  });

  // Recharts Tag Distribution Data
  const tagMap = new Map<string, Tag>(tags.map((t) => [t.id, t]));
  const tagCounts: Record<string, { name: string; count: number; colorHex: string }> = {};

  contacts.forEach((c) => {
    (c.tagIds || []).forEach((tId) => {
      const tag = tagMap.get(tId);
      if (tag) {
        if (!tagCounts[tag.id]) {
          const hex = tag.bgHex ? tag.textHex || TAG_COLOR_HEX_MAP[tag.color] || '#6366f1' : '#6366f1';
          tagCounts[tag.id] = { name: tag.name, count: 0, colorHex: hex };
        }
        tagCounts[tag.id].count += 1;
      }
    });
  });

  const tagChartData = Object.values(tagCounts);

  // Get AI recommendations
  const aiLeadInsights = aiAdvisorService.generateInsights(contacts, interactions, tags).slice(0, 3);

  const getStageIcon = (stage: FunnelStage) => {
    switch (stage) {
      case 'contato': return <Snowflake className="w-4 h-4 text-sky-500" />;
      case 'prospeccao': return <Zap className="w-4 h-4 text-blue-500" />;
      case 'proposta': return <Flame className="w-4 h-4 text-amber-500" />;
      case 'perdido': return <UserCheck className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-24 font-sans animate-fadeIn">
      {/* Welcome & Dashboard Overview Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-indigo-500/10 -skew-x-12 transform translate-x-12 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/30">
                Painel Comercial de Desempenho
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Visão Geral e Métricas do Funil
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Acompanhe seu pipeline ativo, clientes convertidos e volume financeiro em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            {onNavigateToWarZone && (
              <button
                type="button"
                onClick={onNavigateToWarZone}
                className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2 active:scale-95 shrink-0 cursor-pointer ${
                  warZonePendingCount > 0
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 ring-2 ring-amber-400/40 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title="Acessar a Zona de Guerra para primeira abordagem de novos leads"
              >
                <Swords className="w-4 h-4" />
                <span>Zona de Guerra ({warZonePendingCount})</span>
              </button>
            )}

            <button
              onClick={onNavigateToFunnel}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 shrink-0 cursor-pointer"
            >
              <span>Acessar Funil Kanban</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - 5 Columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total em Pipeline Ativo */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-400 dark:hover:border-indigo-500/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Pipeline Aberto
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPipelineValue)}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {activeContacts.length} leads em negociação
            </p>
          </div>
        </div>

        {/* Clientes Fechados (Substituindo Morto) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/60 shadow-sm relative overflow-hidden group hover:border-emerald-400 dark:hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Clientes Fechados
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(clientsValue)}
            </p>
            <p className="text-[11px] font-bold text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              {clientContacts.length} cliente(s) convertidos
            </p>
          </div>
        </div>

        {/* Leads Quentes (Proposta) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-400 dark:hover:border-amber-500/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Leads Quentes
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {hotContacts.length} <span className="text-xs font-bold text-slate-400">leads</span>
            </p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(hotValue)} em fecho
            </p>
          </div>
        </div>

        {/* Taxa de Qualificação / Conversão */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-400 dark:hover:border-emerald-500/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Taxa Conversão
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {conversionRate}%
            </p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Média: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(averageTicket)}
            </p>
          </div>
        </div>

        {/* Interações de Hoje */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-400 dark:hover:border-blue-500/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Interações Hoje
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {todayInteractions} <span className="text-xs font-bold text-slate-400">ações</span>
            </p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Base com {totalContacts} contatos
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores Comerciais & Próximas Ações */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Indicadores Operacionais & Próximas Ações
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Monitoramento contínuo para nenhum lead ficar esquecido
              </p>
            </div>
          </div>

          {onNavigateToAgenda && (
            <button
              onClick={onNavigateToAgenda}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Abrir Agenda Completa</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-1">
          {/* Leads Parados */}
          <div 
            onClick={onNavigateToAgenda}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              leadsParados > 0 
                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-900/60 hover:border-amber-400' 
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              Leads Parados
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-base font-black ${leadsParados > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {leadsParados}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold">&gt;3 dias</span>
            </div>
          </div>

          {/* Retornos Pendentes */}
          <div 
            onClick={onNavigateToAgenda}
            className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 hover:border-indigo-400 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block truncate">
              Retornos Pendentes
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {retornosPendentes}
              </span>
              <span className="text-[9px] text-indigo-400 font-semibold">agendados</span>
            </div>
          </div>

          {/* Sem Próxima Ação */}
          <div 
            onClick={onNavigateToAgenda}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              semProximaAcao > 0 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300/80 dark:border-rose-900/60 hover:border-rose-400' 
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block truncate">
              Sem Próxima Ação
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-rose-600 dark:text-rose-400">
                {semProximaAcao}
              </span>
              <span className="text-[9px] text-rose-400 font-semibold">atenção</span>
            </div>
          </div>

          {/* Tarefas Vencidas */}
          <div 
            onClick={onNavigateToAgenda}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              tarefasVencidas > 0 
                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300/80 dark:border-rose-900/60 hover:border-rose-400' 
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              Tarefas Vencidas
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-base font-black ${tarefasVencidas > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {tarefasVencidas}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold">atrasadas</span>
            </div>
          </div>

          {/* Contatos Realizados */}
          <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
              Contatos Feitos
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {contatosRealizados}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold">total</span>
            </div>
          </div>

          {/* Respostas Recebidas */}
          <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60">
            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 block truncate">
              Respostas Recebidas
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-teal-600 dark:text-teal-400">
                {respostasRecebidas}
              </span>
              <span className="text-[9px] text-teal-400 font-semibold">respostas</span>
            </div>
          </div>

          {/* Avanços de Etapa */}
          <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block truncate">
              Avanços no Funil
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {avancos}
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold">avanços</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Intelligence / Actionable Recommendations */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Ações Prioritárias Recomendadas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Oportunidades que exigem atenção para acelerar o fechamento de novos clientes
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {aiLeadInsights.map((insight) => {
            const contact = contacts.find((c) => c.id === insight.contactId);
            if (!contact) return null;

            return (
              <div
                key={insight.contactId}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      onClick={() => {
                        if (onEditContact) {
                          onEditContact(contact);
                        } else {
                          onSelectContact(contact);
                        }
                      }}
                      className="font-bold text-xs text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                      title="Clique no nome para editar as informações do contato"
                    >
                      <span className="truncate">{insight.contactName}</span>
                      <Edit3 className="w-3 h-3 text-slate-400 hover:text-indigo-500 shrink-0 opacity-70" />
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        insight.urgencyLabel === 'Crítica'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                          : insight.urgencyLabel === 'Alta'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                      }`}
                    >
                      {insight.urgencyLabel} ({insight.priorityScore}%)
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {insight.company} • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(contact.dealValue)}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {insight.recommendation}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectContact(contact)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Abrir Perfil</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={getWhatsAppUrl(contact.phone, insight.suggestedScript)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                    title="Conversar no WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Funnel Analysis Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Distribuição de Oportunidades por Estágio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Volume de contatos e acumulado em cada fase comercial
              </p>
            </div>
            <Target className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis 
                  dataKey="nome" 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    color: '#fff', 
                    border: 'none',
                    fontSize: '12px',
                    padding: '10px 14px'
                  }} 
                  formatter={(value: any, name: any, item: any) => [
                    `${value} ${item.payload.stageKey === 'perdido' ? 'cliente(s)' : 'lead(s)'} (${item.payload.valorFormatado})`,
                    'Volume'
                  ]}
                />
                <Bar dataKey="quantidade" radius={[8, 8, 0, 0]}>
                  {funnelChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.stageKey === 'contato' ? '#0284c7' :
                        entry.stageKey === 'prospeccao' ? '#2563eb' :
                        entry.stageKey === 'proposta' ? '#d97706' : '#10b981'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tag Breakdown Donut Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Contatos por Etiqueta
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Categorização para segmentação de clientes
            </p>

            <div className="h-48 sm:h-52 w-full">
              {tagChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tagChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {tagChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.colorHex} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderRadius: '10px', 
                        color: '#fff', 
                        fontSize: '11px' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Nenhuma etiqueta atribuída
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {tagChartData.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.colorHex }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{t.name}</span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Stage Performance Table - WITH EXTRA COLUMN (Ticket Médio) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Detalhamento de Etapas Comerciais
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Resumo numérico, volume acumulado, ticket médio e representação no funil
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <th className="pb-2.5">Estágio</th>
                <th className="pb-2.5">Qtd. Oportunidades</th>
                <th className="pb-2.5">Valor Acumulado</th>
                <th className="pb-2.5 text-indigo-600 dark:text-indigo-400 font-black">Ticket Médio</th>
                <th className="pb-2.5">% do Total da Base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stageOrder.map((stage) => {
                const cfg = STAGE_CONFIG[stage];
                const count = contacts.filter((c) => c.stage === stage).length;
                const value = contacts.filter((c) => c.stage === stage).reduce((sum, c) => sum + (c.dealValue || 0), 0);
                const avgTicket = count > 0 ? Math.round(value / count) : 0;
                const percent = totalValueAll > 0 
                  ? Math.round((value / totalValueAll) * 100) 
                  : (totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0);

                return (
                  <tr key={stage} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      {getStageIcon(stage)}
                      <span>{cfg.label}</span>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                      {count} {stage === 'perdido' ? 'cliente(s)' : 'lead(s)'}
                    </td>
                    <td className="py-2.5 font-black text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)}
                    </td>
                    <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(avgTicket)}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${stage === 'perdido' ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                            style={{ width: `${Math.min(100, percent)}%` }} 
                          />
                        </div>
                        <span className="font-extrabold text-slate-600 dark:text-slate-400 text-[11px]">
                          {percent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

