import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Persistence directory and file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'crm_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ServerStore {
  users: any[];
  contacts: any[];
  tags: any[];
  interactions: any[];
  tasks: any[];
  savedEvents: any[];
  deletedContactIds: string[];
  version: number;
  lastUpdated: string;
}

const DEFAULT_SERVER_STORE: ServerStore = {
  users: [
    {
      id: 'usr-admin-1',
      name: 'Gestor Comercial',
      email: 'admin@somacrm.com',
      password: 'admin',
      role: 'Administrador / Gestor',
      company: 'Soma CRM Pro',
      phone: '(11) 99876-5432',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    },
    {
      id: 'usr-consultor-2',
      name: 'Carlos Oliveira',
      email: 'vendas@somacrm.com',
      password: '123',
      role: 'Consultor de Vendas',
      company: 'Soma CRM Pro',
      phone: '(11) 98765-4321',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    }
  ],
  tags: [
    { id: 'tag-casa', name: 'Casa', color: 'emerald', bgHex: '#d1fae5', textHex: '#047857', description: 'Interesse imobiliário, casa, residencial ou terreno' },
    { id: 'tag-carro', name: 'Carro', color: 'sky', bgHex: '#e0f2fe', textHex: '#0369a1', description: 'Interesse em veículos, automóveis e carros' },
    { id: 'tag-investimento', name: 'Investimento', color: 'indigo', bgHex: '#e0e7ff', textHex: '#4338ca', description: 'Foco em investimento, rentabilidade ou consórcio' },
    { id: 'tag-sem-dinheiro', name: 'Sem Dinheiro', color: 'rose', bgHex: '#ffe4e6', textHex: '#e11d48', description: 'Sem recurso financeiro ou verba no momento' },
    { id: 'tag-agro', name: 'Agro', color: 'amber', bgHex: '#fef3c7', textHex: '#b45309', description: 'Setor agropecuário, máquinas agrícolas ou produtor' },
    { id: 'tag-caminhao', name: 'Caminhão', color: 'orange', bgHex: '#ffedd5', textHex: '#c2410c', description: 'Interesse em caminhões, frotas e veículos pesados' },
    { id: 'tag-follow-up', name: 'Follow Up', color: 'purple', bgHex: '#f3e8ff', textHex: '#7e22ce', description: 'Acompanhamento e retorno contínuo' },
    { id: 'tag-cliente-analitico', name: 'Cliente Analítico', color: 'cyan', bgHex: '#cffafe', textHex: '#0e7490', description: 'Perfil focado em dados, detalhes e simulações' },
    { id: 'tag-cliente-direto', name: 'Cliente Direto', color: 'blue', bgHex: '#dbeafe', textHex: '#1d4ed8', description: 'Perfil objetivo, direto ao ponto e decidido' },
    { id: 'tag-cliente-amigo', name: 'Cliente Amigo', color: 'teal', bgHex: '#ccfbf1', textHex: '#0f766e', description: 'Perfil relacional, empático e de confiança' },
    { id: 'tag-cliente-empolgado', name: 'Cliente Empolgado', color: 'pink', bgHex: '#fce7f3', textHex: '#be185d', description: 'Perfil motivado, entusiasmado e pronto para fechar' },
  ],
  contacts: [],
  interactions: [],
  tasks: [],
  savedEvents: [],
  deletedContactIds: [],
  version: 1,
  lastUpdated: new Date().toISOString()
};

const LEGACY_TAG_NAMES = new Set([
  'lead quente',
  'vip / key account',
  'vip',
  'tomador de decisão',
  'tomador de decisao',
  'cliente ativo',
  'lead frio',
  'aguardando proposta',
  'pós-venda',
  'pos-venda',
  'cliente técnico',
  'cliente tecnico'
]);

function sanitizeAndMigrateTags(loadedTags: any[]): any[] {
  // Remove legacy obsolete tags
  let filtered = (Array.isArray(loadedTags) ? loadedTags : []).filter((t: any) => {
    if (!t || !t.name) return false;
    const normName = t.name.trim().toLowerCase();
    return !LEGACY_TAG_NAMES.has(normName) && !['tag-1', 'tag-2', 'tag-3', 'tag-4', 'tag-5', 'tag-6', 'tag-7', 'tag-cliente-tecnico'].includes(t.id);
  });

  // Ensure all 12 basic tags are present
  DEFAULT_SERVER_STORE.tags.forEach(defaultTag => {
    const exists = filtered.some((t: any) => t.name.trim().toLowerCase() === defaultTag.name.toLowerCase() || t.id === defaultTag.id);
    if (!exists) {
      filtered.push({ ...defaultTag });
    }
  });

  return filtered;
}

function loadStore(): ServerStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      const migratedTags = sanitizeAndMigrateTags(data.tags);
      const deletedIds = Array.isArray(data.deletedContactIds) ? data.deletedContactIds : [];
      const rawContacts = Array.isArray(data.contacts) ? data.contacts : DEFAULT_SERVER_STORE.contacts;
      const filteredContacts = rawContacts.filter((c: any) => c && !deletedIds.includes(c.id));

      const storeResult = {
        users: Array.isArray(data.users) ? data.users : DEFAULT_SERVER_STORE.users,
        contacts: filteredContacts,
        tags: migratedTags,
        interactions: Array.isArray(data.interactions) ? data.interactions.filter((i: any) => !deletedIds.includes(i.contactId)) : DEFAULT_SERVER_STORE.interactions,
        tasks: Array.isArray(data.tasks) ? data.tasks.filter((t: any) => !deletedIds.includes(t.contactId) && !deletedIds.includes(t.id)) : [],
        savedEvents: Array.isArray(data.savedEvents) ? data.savedEvents : [],
        deletedContactIds: deletedIds,
        version: typeof data.version === 'number' ? data.version : 1,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
      // Persist migrated tags/store back
      saveStore(storeResult);
      return storeResult;
    }
  } catch (err) {
    console.error('Error loading store from file:', err);
  }
  return { ...DEFAULT_SERVER_STORE };
}

function saveStore(store: ServerStore): void {
  try {
    store.lastUpdated = new Date().toISOString();
    store.version = (store.version || 0) + 1;
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store to file:', err);
  }
}

// In-memory active cache synced to disk
let store = loadStore();

// ================= API ROUTES =================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    usersCount: store.users.length,
    contactsCount: store.contacts.length,
    version: store.version
  });
});

// Auth: Login across devices
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ success: false, error: 'Identificador e senha são obrigatórios.' });
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const cleanPass = String(password).trim();

  // Reload store to get latest updates from other devices
  store = loadStore();

  const user = store.users.find(u => 
    (u.email.toLowerCase() === cleanId || 
     u.name.toLowerCase() === cleanId || 
     u.email.toLowerCase().split('@')[0] === cleanId) &&
    (u.password === cleanPass || (!u.password && cleanPass === '123456'))
  );

  if (!user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Credenciais inválidas. Verifique seu e-mail e senha.' 
    });
  }

  user.lastLoginAt = new Date().toISOString();
  saveStore(store);

  // Return clean user object
  const { password: _, ...userSafe } = user;
  res.json({ success: true, user: userSafe });
});

// Auth: Register across devices
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, company, role, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios.' });
  }

  store = loadStore();
  const cleanEmail = String(email).trim().toLowerCase();

  const existing = store.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ 
      success: false, 
      error: 'Este e-mail já está cadastrado. Faça login em qualquer celular.' 
    });
  }

  const cleanName = String(name).trim();
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: cleanName,
    email: cleanEmail,
    password: String(password).trim(),
    company: company ? String(company).trim() : 'Minha Empresa',
    role: role ? String(role).trim() : 'Consultor Comercial',
    phone: phone ? String(phone).trim() : '',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  store.users.push(newUser);
  saveStore(store);

  const { password: _, ...userSafe } = newUser;
  res.json({ success: true, user: userSafe });
});

// Auth: Update user profile
app.post('/api/auth/update-profile', (req, res) => {
  const { userId, name, company, role, phone, avatarUrl, currentPassword, newPassword } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'ID de usuário obrigatório.' });
  }

  store = loadStore();
  const userIndex = store.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
  }

  const user = store.users[userIndex];

  // If changing password, verify old password
  if (newPassword) {
    if (user.password && user.password !== currentPassword) {
      return res.status(403).json({ success: false, error: 'Senha atual incorreta.' });
    }
    user.password = String(newPassword).trim();
  }

  if (name) user.name = String(name).trim();
  if (company !== undefined) user.company = String(company).trim();
  if (role !== undefined) user.role = String(role).trim();
  if (phone !== undefined) user.phone = String(phone).trim();
  if (avatarUrl !== undefined) user.avatarUrl = String(avatarUrl).trim();

  store.users[userIndex] = user;
  saveStore(store);

  const { password: _, ...userSafe } = user;
  res.json({ success: true, user: userSafe });
});

// Sync: Get full cloud state
app.get('/api/sync/state', (req, res) => {
  store = loadStore();
  const deletedIds = store.deletedContactIds || [];
  const validContacts = (store.contacts || []).filter(c => c && !deletedIds.includes(c.id));
  res.json({
    success: true,
    version: store.version,
    lastUpdated: store.lastUpdated,
    data: {
      contacts: validContacts,
      tags: store.tags,
      interactions: (store.interactions || []).filter(i => !deletedIds.includes(i.contactId)),
      tasks: (store.tasks || []).filter(t => !deletedIds.includes(t.contactId) && !deletedIds.includes(t.id)),
      savedEvents: store.savedEvents || [],
      deletedContactIds: deletedIds,
      users: store.users.map(u => {
        const { password, ...safe } = u;
        return safe;
      })
    }
  });
});

// Sync: Push changes from mobile client (queue items or batch sync)
app.post('/api/sync/push', (req, res) => {
  const { items, contacts, tags, interactions, tasks, savedEvents, deletedContactIds } = req.body;
  store = loadStore();

  if (!Array.isArray(store.deletedContactIds)) {
    store.deletedContactIds = [];
  }

  let modified = false;

  // Merge deleted contact IDs (tombstones)
  if (Array.isArray(deletedContactIds)) {
    deletedContactIds.forEach(id => {
      if (id && !store.deletedContactIds.includes(id)) {
        store.deletedContactIds.push(id);
        modified = true;
      }
    });
  }

  // Purge any existing store records that match deleted IDs
  if (store.deletedContactIds.length > 0) {
    const beforeLen = store.contacts.length;
    store.contacts = store.contacts.filter(c => c && !store.deletedContactIds.includes(c.id));
    store.interactions = store.interactions.filter(i => !store.deletedContactIds.includes(i.contactId));
    if (Array.isArray(store.tasks)) {
      store.tasks = store.tasks.filter(t => !store.deletedContactIds.includes(t.contactId) && !store.deletedContactIds.includes(t.id));
    }
    if (store.contacts.length !== beforeLen) {
      modified = true;
    }
  }

  // Process batch full sync if provided
  if (Array.isArray(contacts) && contacts.length > 0) {
    // Upsert contacts, strictly ignoring any in deletedContactIds
    contacts.forEach(c => {
      if (!c || !c.id || store.deletedContactIds.includes(c.id)) return;
      const idx = store.contacts.findIndex(item => item.id === c.id);
      if (idx >= 0) {
        // Only update if client updatedAt is newer or equal
        const clientTime = new Date(c.updatedAt || 0).getTime();
        const serverTime = new Date(store.contacts[idx].updatedAt || 0).getTime();
        if (clientTime >= serverTime) {
          store.contacts[idx] = { ...c, synced: true };
          modified = true;
        }
      } else {
        store.contacts.unshift({ ...c, synced: true });
        modified = true;
      }
    });
  }

  if (Array.isArray(tags) && tags.length > 0) {
    tags.forEach(t => {
      const idx = store.tags.findIndex(item => item.id === t.id);
      if (idx >= 0) {
        store.tags[idx] = t;
      } else {
        store.tags.push(t);
      }
      modified = true;
    });
  }

  if (Array.isArray(interactions) && interactions.length > 0) {
    interactions.forEach(int => {
      if (int && int.contactId && store.deletedContactIds.includes(int.contactId)) return;
      const idx = store.interactions.findIndex(item => item.id === int.id);
      if (idx === -1) {
        store.interactions.unshift({ ...int, synced: true });
        modified = true;
      }
    });
  }

  if (Array.isArray(tasks) && tasks.length > 0) {
    if (!Array.isArray(store.tasks)) store.tasks = [];
    tasks.forEach(task => {
      if (task && ((task.contactId && store.deletedContactIds.includes(task.contactId)) || store.deletedContactIds.includes(task.id))) return;
      const idx = store.tasks.findIndex(t => t.id === task.id);
      if (idx >= 0) {
        store.tasks[idx] = { ...task, synced: true };
      } else {
        store.tasks.unshift({ ...task, synced: true });
      }
      modified = true;
    });
  }

  if (Array.isArray(savedEvents) && savedEvents.length > 0) {
    if (!Array.isArray(store.savedEvents)) store.savedEvents = [];
    savedEvents.forEach(evt => {
      const idx = store.savedEvents.findIndex(e => e.id === evt.id);
      if (idx >= 0) {
        store.savedEvents[idx] = evt;
      } else {
        store.savedEvents.unshift(evt);
      }
      modified = true;
    });
  }

  // Process individual action items if provided
  if (Array.isArray(items)) {
    items.forEach(item => {
      const { action, payload } = item;
      if (!action || !payload) return;

      switch (action) {
        case 'CLEAR_ALL_CONTACTS': {
          store.contacts = [];
          store.interactions = [];
          store.tasks = [];
          modified = true;
          break;
        }
        case 'CREATE_CONTACT':
        case 'UPDATE_CONTACT': {
          if (payload.id && store.deletedContactIds.includes(payload.id)) break;
          const idx = store.contacts.findIndex(c => c.id === payload.id);
          if (idx >= 0) {
            store.contacts[idx] = { ...payload, synced: true };
          } else {
            store.contacts.unshift({ ...payload, synced: true });
          }
          modified = true;
          break;
        }
        case 'DELETE_CONTACT': {
          const dId = payload.id;
          if (dId && !store.deletedContactIds.includes(dId)) {
            store.deletedContactIds.push(dId);
          }
          store.contacts = store.contacts.filter(c => c.id !== dId && !store.deletedContactIds.includes(c.id));
          store.interactions = store.interactions.filter(i => i.contactId !== dId);
          if (Array.isArray(store.tasks)) {
            store.tasks = store.tasks.filter(t => t.contactId !== dId && t.id !== dId);
          }
          modified = true;
          break;
        }
        case 'CREATE_TAG': {
          const idx = store.tags.findIndex(t => t.id === payload.id);
          if (idx >= 0) {
            store.tags[idx] = payload;
          } else {
            store.tags.push(payload);
          }
          modified = true;
          break;
        }
        case 'DELETE_TAG': {
          store.tags = store.tags.filter(t => t.id !== payload.id);
          store.contacts = store.contacts.map(c => ({
            ...c,
            tagIds: Array.isArray(c.tagIds) ? c.tagIds.filter(id => id !== payload.id) : []
          }));
          modified = true;
          break;
        }
        case 'LOG_INTERACTION': {
          if (payload.contactId && store.deletedContactIds.includes(payload.contactId)) break;
          const idx = store.interactions.findIndex(i => i.id === payload.id);
          if (idx === -1) {
            store.interactions.unshift({ ...payload, synced: true });
            modified = true;
          }
          break;
        }
        case 'SAVE_TASK': {
          if (payload.contactId && store.deletedContactIds.includes(payload.contactId)) break;
          if (!Array.isArray(store.tasks)) store.tasks = [];
          const idx = store.tasks.findIndex(t => t.id === payload.id);
          if (idx >= 0) {
            store.tasks[idx] = { ...payload, synced: true };
          } else {
            store.tasks.unshift({ ...payload, synced: true });
          }
          modified = true;
          break;
        }
        case 'DELETE_TASK': {
          if (Array.isArray(store.tasks)) {
            store.tasks = store.tasks.filter(t => t.id !== payload.id);
            modified = true;
          }
          break;
        }
        case 'SAVE_EVENT': {
          if (!Array.isArray(store.savedEvents)) store.savedEvents = [];
          const idx = store.savedEvents.findIndex(e => e.id === payload.id);
          if (idx >= 0) {
            store.savedEvents[idx] = payload;
          } else {
            store.savedEvents.unshift(payload);
          }
          modified = true;
          break;
        }
        case 'DELETE_EVENT': {
          if (Array.isArray(store.savedEvents)) {
            store.savedEvents = store.savedEvents.filter(e => e.id !== payload.id);
            modified = true;
          }
          break;
        }
      }
    });
  }

  if (modified) {
    saveStore(store);
  }

  const activeDeleted = store.deletedContactIds || [];
  res.json({
    success: true,
    version: store.version,
    lastUpdated: store.lastUpdated,
    serverSnapshot: {
      contacts: (store.contacts || []).filter(c => c && !activeDeleted.includes(c.id)),
      tags: store.tags,
      interactions: (store.interactions || []).filter(i => !activeDeleted.includes(i.contactId)),
      tasks: (store.tasks || []).filter(t => !activeDeleted.includes(t.contactId) && !activeDeleted.includes(t.id)),
      savedEvents: store.savedEvents || [],
      deletedContactIds: activeDeleted,
    }
  });
});

// Workspace / multi-device stats
app.get('/api/workspace/info', (req, res) => {
  store = loadStore();
  res.json({
    success: true,
    totalUsers: store.users.length,
    totalContacts: store.contacts.length,
    lastSync: store.lastUpdated,
    cloudSyncActive: true,
    serverHost: 'Cloud Central SOMA CRM'
  });
});

// Server latency & response time test endpoint
app.get('/api/ping', (req, res) => {
  const start = process.hrtime();
  const diff = process.hrtime(start);
  const latencyMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
  res.json({
    success: true,
    message: 'Servidor operacional',
    latencyMs: parseFloat(latencyMs),
    serverTime: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Clear all contacts and interactions completely
app.post('/api/contacts/clear-all', (req, res) => {
  store = loadStore();
  store.contacts = [];
  store.interactions = [];
  saveStore(store);
  res.json({ success: true, message: 'Todos os leads e interações foram removidos com sucesso.', contactsCount: 0 });
});

// ================= VITE / SPA MIDDLEWARE =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud CRM Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
