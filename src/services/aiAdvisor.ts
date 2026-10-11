import { Contact, Interaction, Tag } from '../types';

export interface AILeadInsight {
  contactId: string;
  contactName: string;
  company: string;
  priorityScore: number; // 0-100
  urgencyLabel: 'Crítica' | 'Alta' | 'Média' | 'Normal';
  recommendation: string;
  suggestedScript: string;
}

export class AIAdvisorService {
  /**
   * Generates intelligent CRM sales insights and prioritization for contacts
   */
  public generateInsights(contacts: Contact[], interactions: Interaction[], tags: Tag[]): AILeadInsight[] {
    const now = Date.now();
    const tagMap = new Map(tags.map((t) => [t.id, t]));

    return contacts.map((contact) => {
      let score = 50;
      const contactInteractions = interactions.filter((i) => i.contactId === contact.id);
      const hoursSinceLastInteraction = Math.floor(
        (now - new Date(contact.lastInteractionDate).getTime()) / (1000 * 60 * 60)
      );

      // Tag influence
      const hasHotLeadTag = (contact.tagIds || []).some((id) => {
        const tag = tagMap.get(id);
        const name = tag?.name.toLowerCase() || '';
        return name.includes('empolgado') || name.includes('direto') || name.includes('investimento') || name.includes('carro') || name.includes('casa');
      });
      if (hasHotLeadTag) score += 25;

      // Stage influence
      if (contact.stage === 'proposta') score += 25;
      if (contact.stage === 'prospeccao') score += 15;
      if (contact.stage === 'contato') score += 10;
      if (contact.stage === 'perdido') score = 10;

      // Value influence
      if (contact.dealValue > 40000) score += 15;

      // Time inertia risk penalty
      if (hoursSinceLastInteraction > 72 && contact.stage !== 'perdido') {
        score += 15; // Requires immediate re-engagement
      }

      // Clamp 0-100
      score = Math.min(99, Math.max(10, score));

      let urgencyLabel: 'Crítica' | 'Alta' | 'Média' | 'Normal' = 'Normal';
      if (score >= 85) urgencyLabel = 'Crítica';
      else if (score >= 70) urgencyLabel = 'Alta';
      else if (score >= 50) urgencyLabel = 'Média';

      let recommendation = '';
      let suggestedScript = '';

      if (contact.stage === 'proposta') {
        recommendation = 'Lead Quente! Envie mensagem no WhatsApp oferecendo tira-dúvidas rápido e alinhamento de contrato.';
        suggestedScript = `Olá ${(contact.name || '').split(' ')[0]}! Tudo bem? Passando para saber se conseguiu revisar nossa proposta comercial da ${contact.company}. Podemos agendar 5 min para tirar dúvidas?`;
      } else if (contact.stage === 'prospeccao') {
        recommendation = 'Contato Vivo em prospecção. Realize uma ligação ou mensagem para entender o momento e demandas.';
        suggestedScript = `Olá ${(contact.name || '').split(' ')[0]}, vi que demonstrou interesse na nossa solução para a ${contact.company}. Qual seria o melhor horário para conversarmos rapidamente?`;
      } else if (contact.stage === 'contato') {
        recommendation = 'Contato Frio. Apresente os principais benefícios e convide para um primeiro contato.';
        suggestedScript = `Olá ${(contact.name || '').split(' ')[0]}! Gostaria de apresentar como ajudamos empresas como a ${contact.company} a alavancar resultados. Podemos bater um papo?`;
      } else {
        recommendation = 'Contato em pausa / arquivado. Manter relacionamento eventual para reativação no futuro.';
        suggestedScript = `Olá ${(contact.name || '').split(' ')[0]}! Passando para ver como estão as coisas na ${contact.company}. Precisando de qualquer suporte no futuro, conte comigo!`;
      }

      return {
        contactId: contact.id,
        contactName: contact.name,
        company: contact.company,
        priorityScore: score,
        urgencyLabel,
        recommendation,
        suggestedScript,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

export const aiAdvisorService = new AIAdvisorService();
