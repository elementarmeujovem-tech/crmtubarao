import { Task, SavedEvent } from '../types';

/**
 * Format a Date object or ISO string to local YYYY-MM-DD safely without timezone shifts
 */
export function toLocalDateString(dateInput: Date | string | undefined | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput.slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day = String(dateInput.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to iCalendar UTC timestamp format: YYYYMMDDTHHMMSSZ
 */
function formatIcsDateTime(dateStr: string, timeStr?: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = (timeStr || '14:00').split(':').map(Number);
    
    // Construct local date and convert to ISO string format without separators
    const d = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  } catch (e) {
    return dateStr.replace(/-/g, '') + 'T120000';
  }
}

/**
 * Generates a direct Google Calendar web intent URL to add an event with 1 click
 */
export function getGoogleCalendarUrl(options: {
  title: string;
  date: string;
  time?: string;
  durationMinutes?: number;
  description?: string;
  location?: string;
}): string {
  const { title, date, time = '14:00', durationMinutes = 45, description = '', location = '' } = options;

  const startFormatted = formatIcsDateTime(date, time);
  
  // Calculate end time
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const endDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, (minutes || 0) + durationMinutes, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  const endFormatted = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startFormatted}/${endFormatted}`,
    details: description,
    location: location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates and triggers download of an .ics file containing all tasks and saved events
 * Fully compatible with Google Calendar, Outlook, Apple Calendar and Android.
 */
export function downloadIcsCalendar(tasks: Task[], savedEvents: SavedEvent[], filename: string = 'agenda_crm_flow.ics'): void {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Soma CRM//CRM Flow Agenda 2.0//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Soma CRM - Agenda Comercial',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // 1. Export tasks
  tasks.forEach((task) => {
    if (!task.date) return;
    const start = formatIcsDateTime(task.date, task.time);
    const [year, month, day] = task.date.split('-').map(Number);
    const [hours, minutes] = (task.time || '14:00').split(':').map(Number);
    const endDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, (minutes || 0) + 45, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

    const summary = task.title.replace(/[\r\n]+/g, ' ');
    const desc = [
      task.notes || '',
      task.contactName ? `Lead / Contato: ${task.contactName}` : '',
      task.contactPhone ? `WhatsApp: ${task.contactPhone}` : '',
      task.completed ? 'Status: Concluída' : 'Status: Pendente',
    ].filter(Boolean).join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:task-${task.id}@crmflow.com`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${summary}`);
    if (desc) lines.push(`DESCRIPTION:${desc}`);
    if (task.eventVenue) lines.push(`LOCATION:${task.eventVenue.replace(/[\r\n]+/g, ' ')}`);
    lines.push(`STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  });

  // 2. Export saved external events
  savedEvents.forEach((event) => {
    if (!event.date) return;
    const start = formatIcsDateTime(event.date, event.time || '09:00');
    const [year, month, day] = event.date.split('-').map(Number);
    const [hours, minutes] = (event.time || '09:00').split(':').map(Number);
    const endDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, (minutes || 0) + 120, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;

    const summary = `[Evento CRM] ${event.title}`.replace(/[\r\n]+/g, ' ');
    const desc = [
      event.description || '',
      event.commercialNotes ? `Notas Comerciais: ${event.commercialNotes}` : '',
      `Pontuação Comercial: ${event.commercialScore}/100`,
      (event.sourceUrl || event.originalUrl) ? `Link: ${event.sourceUrl || event.originalUrl}` : '',
    ].filter(Boolean).join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:event-${event.id}@crmflow.com`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${summary}`);
    if (desc) lines.push(`DESCRIPTION:${desc}`);
    if (event.venue) lines.push(`LOCATION:${event.venue.replace(/[\r\n]+/g, ' ')}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
