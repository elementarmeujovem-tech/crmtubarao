import { Contact, FunnelStage, Tag } from '../types';
import { formatWhatsAppPhone } from './whatsapp';

export interface CsvContactRow {
  indexNumber?: string;
  name: string;
  phone: string;
  company?: string;
  origin?: string;
  email?: string;
  classification?: string;
  registrationDate?: string;
  notes?: string;
  rawRow: Record<string, string>;
}

export interface ParseCsvResult {
  headers: string[];
  rows: CsvContactRow[];
  totalRows: number;
  validContactsCount: number;
  samplePreview: CsvContactRow[];
  detectedColumns: {
    nameIndex: number;
    phoneIndex: number;
    companyIndex: number;
    originIndex: number;
    emailIndex: number;
    classificationIndex: number;
    dateIndex: number;
    numberIndex: number;
  };
}

/**
 * Robust CSV Line Parser taking into account quotes, semicolons and commas
 */
export function parseCsvTextToMatrix(csvText: string): string[][] {
  const lines: string[][] = [];
  const cleanText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Detect primary delimiter: semicolon ';' or comma ','
  const firstLine = cleanText.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // skip next quote
        } else {
          // End of quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Add last field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Normalizes header string to find matching column
 */
function normalizeHeader(h: string): string {
  return (h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses Brazilian date string (e.g. 28/08/2025 or 28/08/2025 14:30) to ISO string
 */
export function parseDateToIso(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return new Date().toISOString();

  const trimmed = dateStr.trim();

  // Pattern DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const hour = brMatch[4] ? parseInt(brMatch[4], 10) : 12;
    const minute = brMatch[5] ? parseInt(brMatch[5], 10) : 0;

    const d = new Date(year, month, day, hour, minute);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  // Standard ISO or YYYY-MM-DD
  const directDate = new Date(trimmed);
  if (!isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  return new Date().toISOString();
}

/**
 * Parses CSV text with specific header detection
 */
export function parseContactsCsv(csvText: string): ParseCsvResult {
  const matrix = parseCsvTextToMatrix(csvText);

  if (matrix.length === 0) {
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

  const rawHeaders = matrix[0];
  const detectedColumns = {
    numberIndex: -1,
    nameIndex: -1,
    phoneIndex: -1,
    companyIndex: -1,
    originIndex: -1,
    emailIndex: -1,
    classificationIndex: -1,
    dateIndex: -1,
  };

  rawHeaders.forEach((h, idx) => {
    const norm = normalizeHeader(h);

    if (norm === 'n' || norm === 'no' || norm === 'num' || norm === 'numero' || norm === 'id') {
      detectedColumns.numberIndex = idx;
    } else if (norm.includes('nome') || norm === 'name' || norm === 'contato' || norm === 'lead') {
      if (detectedColumns.nameIndex === -1) detectedColumns.nameIndex = idx;
    } else if (
      norm.includes('celular') || 
      norm.includes('telefone') || 
      norm.includes('phone') || 
      norm.includes('whatsapp') || 
      norm.includes('tel') || 
      norm.includes('fone') || 
      norm.includes('movel')
    ) {
      if (detectedColumns.phoneIndex === -1) detectedColumns.phoneIndex = idx;
    } else if (norm.includes('empresa') || norm.includes('company') || norm.includes('organizacao')) {
      detectedColumns.companyIndex = idx;
    } else if (norm.includes('origem') || norm.includes('fonte') || norm.includes('source') || norm.includes('canal')) {
      detectedColumns.originIndex = idx;
    } else if (norm.includes('email') || norm.includes('mail') || norm.includes('correio')) {
      detectedColumns.emailIndex = idx;
    } else if (norm.includes('classificac') || norm.includes('status') || norm.includes('tipo') || norm.includes('categoria')) {
      detectedColumns.classificationIndex = idx;
    } else if (norm.includes('data') || norm.includes('date') || norm.includes('cadastro') || norm.includes('criado')) {
      detectedColumns.dateIndex = idx;
    }
  });

  // Fallbacks if headers weren't named specifically (e.g. index position heuristic)
  if (detectedColumns.nameIndex === -1 && rawHeaders.length > 1) {
    detectedColumns.nameIndex = 1; // 2nd column typically "Nome"
  }
  if (detectedColumns.phoneIndex === -1 && rawHeaders.length > 2) {
    detectedColumns.phoneIndex = 2; // 3rd column typically "Celular"
  }

  const rows: CsvContactRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

    const rawMap: Record<string, string> = {};
    rawHeaders.forEach((h, hIdx) => {
      rawMap[h || `Coluna ${hIdx + 1}`] = row[hIdx] || '';
    });

    const indexNumber = detectedColumns.numberIndex !== -1 ? row[detectedColumns.numberIndex] : String(i);
    const name = detectedColumns.nameIndex !== -1 ? (row[detectedColumns.nameIndex] || '').trim() : '';
    const phone = detectedColumns.phoneIndex !== -1 ? (row[detectedColumns.phoneIndex] || '').trim() : '';
    const company = detectedColumns.companyIndex !== -1 ? (row[detectedColumns.companyIndex] || '').trim() : '';
    const origin = detectedColumns.originIndex !== -1 ? (row[detectedColumns.originIndex] || '').trim() : '';
    const email = detectedColumns.emailIndex !== -1 ? (row[detectedColumns.emailIndex] || '').trim() : '';
    const classification = detectedColumns.classificationIndex !== -1 ? (row[detectedColumns.classificationIndex] || '').trim() : '';
    const registrationDate = detectedColumns.dateIndex !== -1 ? (row[detectedColumns.dateIndex] || '').trim() : '';

    if (name || phone) {
      rows.push({
        indexNumber,
        name: name || `Contato ${indexNumber}`,
        phone,
        company,
        origin,
        email,
        classification,
        registrationDate,
        rawRow: rawMap,
      });
    }
  }

  const validContactsCount = rows.filter((r) => r.name.trim() && r.phone.replace(/\D/g, '').length >= 8).length;

  return {
    headers: rawHeaders,
    rows,
    totalRows: rows.length,
    validContactsCount,
    samplePreview: rows.slice(0, 10),
    detectedColumns,
  };
}

/**
 * Assigns color hex to newly generated tag names
 */
const TAG_COLOR_PALETTES = [
  { bgHex: '#e0e7ff', textHex: '#4338ca' }, // indigo
  { bgHex: '#fce7f3', textHex: '#be185d' }, // pink
  { bgHex: '#e0f2fe', textHex: '#0369a1' }, // sky
  { bgHex: '#fef3c7', textHex: '#b45309' }, // amber
  { bgHex: '#d1fae5', textHex: '#047857' }, // emerald
  { bgHex: '#ede9fe', textHex: '#6d28d9' }, // purple
  { bgHex: '#fee2e2', textHex: '#b91c1c' }, // red
  { bgHex: '#ffedd5', textHex: '#c2410c' }, // orange
  { bgHex: '#ccfbf1', textHex: '#0f766e' }, // teal
];

/**
 * Converts CSV rows to full Contact and Tag objects
 */
export function convertCsvRowsToContacts(
  rows: CsvContactRow[],
  existingTags: Tag[],
  options: {
    defaultStage?: FunnelStage | 'auto';
    createOriginTags?: boolean;
    createClassificationTags?: boolean;
    dealValueDefault?: number;
  } = {}
): { contacts: Contact[]; newTags: Tag[] } {
  const {
    defaultStage = 'auto',
    createOriginTags = true,
    createClassificationTags = true,
    dealValueDefault = 0,
  } = options;

  const currentTagMap = new Map<string, Tag>(
    existingTags.map((t) => [t.name.trim().toLowerCase(), t])
  );
  const createdTags: Tag[] = [];

  // Helper to find or create tag
  const getOrCreateTag = (rawTagName?: string): string | null => {
    if (!rawTagName || !rawTagName.trim()) return null;
    const cleanName = rawTagName.trim();
    const lookupKey = cleanName.toLowerCase();

    if (currentTagMap.has(lookupKey)) {
      return currentTagMap.get(lookupKey)!.id;
    }

    const colorIdx = (createdTags.length + existingTags.length) % TAG_COLOR_PALETTES.length;
    const palette = TAG_COLOR_PALETTES[colorIdx];
    const newTagId = `tag-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newTag: Tag = {
      id: newTagId,
      name: cleanName,
      color: 'indigo',
      bgHex: palette.bgHex,
      textHex: palette.textHex,
      description: `Etiqueta gerada da importação de contatos`,
    };

    currentTagMap.set(lookupKey, newTag);
    createdTags.push(newTag);
    return newTagId;
  };

  const contacts: Contact[] = rows.map((row, idx) => {
    const tagIds: string[] = [];

    // Tag for Origin (e.g. TikTok, Facebook, Indicação, etc.)
    if (createOriginTags && row.origin && row.origin.trim()) {
      const originTagId = getOrCreateTag(`Origem: ${row.origin.trim()}`);
      if (originTagId && !tagIds.includes(originTagId)) {
        tagIds.push(originTagId);
      }
    }

    // Tag for Classification (e.g. Lead, Cliente, Prospect)
    if (createClassificationTags && row.classification && row.classification.trim()) {
      const classTagId = getOrCreateTag(row.classification.trim());
      if (classTagId && !tagIds.includes(classTagId)) {
        tagIds.push(classTagId);
      }
    }

    // Determine Stage
    let stage: FunnelStage = 'contato'; // Frio
    if (defaultStage && defaultStage !== 'auto') {
      stage = defaultStage;
    } else {
      const classNorm = (row.classification || '').toLowerCase();
      if (classNorm.includes('cliente')) {
        stage = 'proposta'; // Quente
      } else if (classNorm.includes('prospect')) {
        stage = 'prospeccao'; // Vivo
      } else {
        stage = 'contato'; // Frio
      }
    }

    const isoDate = parseDateToIso(row.registrationDate);
    const formattedPhone = row.phone ? formatWhatsAppPhone(row.phone) : '';

    return {
      id: `c-csv-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      name: row.name,
      phone: formattedPhone || row.phone,
      email: row.email || '',
      company: row.company || '',
      role: row.classification || 'Lead',
      tagIds,
      stage,
      dealValue: dealValueDefault,
      lastInteractionDate: isoDate,
      createdAt: isoDate,
      updatedAt: new Date().toISOString(),
      notes: [
        row.origin ? `Origem: ${row.origin}` : '',
        row.classification ? `Classificação: ${row.classification}` : '',
        row.indexNumber ? `N° Registro Original: ${row.indexNumber}` : '',
      ]
        .filter(Boolean)
        .join(' | '),
      synced: true,
    };
  });

  return { contacts, newTags: createdTags };
}

/**
 * Generates CSV string to export contacts in the same specific column format
 */
export function exportContactsToCsv(contacts: Contact[], tags: Tag[]): string {
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));

  const headers = [
    '"N°"',
    '"Nome"',
    '"Celular"',
    '"Empresa"',
    '"Origem"',
    '"E-mail"',
    '"Classificações"',
    '"Data cadastro"',
    '"Ações"',
  ];

  const lines = contacts.map((c, idx) => {
    const contactTags = c.tagIds.map((tid) => tagMap.get(tid) || '').filter(Boolean);
    const originTag = contactTags.find((t) => t.startsWith('Origem:'))?.replace('Origem:', '').trim() || '';
    const otherTags = contactTags.filter((t) => !t.startsWith('Origem:')).join(', ');
    
    // Format registration date as DD/MM/YYYY
    let formattedDate = '';
    try {
      const d = new Date(c.createdAt || c.lastInteractionDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('pt-BR');
      }
    } catch {
      formattedDate = '';
    }

    const escapeCsv = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;

    return [
      escapeCsv(String(idx + 1)),
      escapeCsv(c.name),
      escapeCsv(c.phone),
      escapeCsv(c.company),
      escapeCsv(originTag),
      escapeCsv(c.email),
      escapeCsv(otherTags || c.role || 'Lead'),
      escapeCsv(formattedDate),
      escapeCsv('Editar'),
    ].join(',');
  });

  return [headers.join(','), ...lines].join('\n');
}
