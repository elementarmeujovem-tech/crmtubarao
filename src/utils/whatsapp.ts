/**
 * Utilitário universal para envio de mensagens via WhatsApp / WhatsApp Business
 */

export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  
  // Se for número brasileiro com 10 ou 11 dígitos sem DDI (55), adiciona 55
  if ((cleaned.length === 10 || cleaned.length === 11) && !cleaned.startsWith('55')) {
    cleaned = `55${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Retorna a URL universal do WhatsApp (compatível com WhatsApp e WhatsApp Business no celular e no computador)
 */
export function getWhatsAppUrl(phone: string, text: string = ''): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return '#';

  const encodedText = text ? encodeURIComponent(text) : '';
  const textParam = encodedText ? `&text=${encodedText}` : '';
  
  return `https://api.whatsapp.com/send?phone=${cleanPhone}${textParam}`;
}

// Alias para compatibilidade
export const getWhatsAppBusinessUrl = getWhatsAppUrl;

/**
 * Função de abertura segura
 */
export function openWhatsApp(phone: string, text: string = '') {
  const url = getWhatsAppUrl(phone, text);
  if (!url || url === '#') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
