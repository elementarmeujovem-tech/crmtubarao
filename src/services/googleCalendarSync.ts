import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task } from '../types';

// Initialize Firebase App safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

let cachedAccessToken: string | null = null;
let currentGoogleUser: FirebaseUser | null = null;

// Check redirect result on load in case redirect was used
getRedirectResult(auth).then((result) => {
  if (result) {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      currentGoogleUser = result.user;
    }
  }
}).catch((err) => {
  console.error('Redirect result error:', err);
});

export const initGoogleAuth = (onSuccess?: (user: FirebaseUser, token: string) => void, onFailure?: () => void) => {
  return onAuthStateChanged(auth, (user) => {
    currentGoogleUser = user;
    if (user && cachedAccessToken) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      if (onFailure) onFailure();
    }
  });
};

export const signInWithGoogleCalendar = async (): Promise<{ user: FirebaseUser; accessToken: string }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Calendar.');
    }
    cachedAccessToken = credential.accessToken;
    currentGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.warn('Popup sign-in failed or closed, trying redirect flow:', error);
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/popup-blocked-by-browser' || error?.code === 'auth/cancelled-popup-request') {
      try {
        await signInWithRedirect(auth, provider);
        // Will redirect page
        throw new Error('Redirecionando para autenticação do Google...');
      } catch (redirectErr: any) {
        throw redirectErr;
      }
    }
    throw error;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getConnectedGoogleUser = (): FirebaseUser | null => {
  return currentGoogleUser;
};

export const signOutGoogleCalendar = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
  currentGoogleUser = null;
};

/**
 * Syncs a single CRM Task to the user's Google Calendar primary calendar
 */
export async function syncTaskToGoogleCalendar(task: Task, accessToken?: string): Promise<{ success: boolean; error?: string }> {
  const token = accessToken || cachedAccessToken;
  if (!token) {
    return { success: false, error: 'Usuário não autenticado no Google Calendar. Conecte sua conta Google primeiro.' };
  }

  try {
    const startDateTime = task.dueDateTime || `${task.date}T${task.time || '14'}:00:00Z`;
    // Calculate end time (45 mins later)
    const startDate = new Date(startDateTime);
    if (isNaN(startDate.getTime())) {
      return { success: false, error: 'Data da tarefa inválida.' };
    }
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000);

    const eventPayload = {
      summary: `[Soma CRM] ${task.title}`,
      description: [
        task.notes || '',
        task.contactName ? `Contato: ${task.contactName}` : '',
        task.contactPhone ? `WhatsApp: ${task.contactPhone}` : '',
        `Status: ${task.completed ? 'Concluída' : 'Pendente'}`,
      ].filter(Boolean).join('\n'),
      location: task.eventVenue || '',
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return { success: false, error: errJson.error?.message || `Erro HTTP ${response.status} ao sincronizar com Google Agenda.` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error syncing task to Google Calendar:', err);
    return { success: false, error: err.message || 'Erro de conexão ao sincronizar com Google Agenda.' };
  }
}

/**
 * Syncs all pending tasks to Google Calendar
 */
export async function syncAllTasksToGoogleCalendar(tasks: Task[]): Promise<{ syncedCount: number; errors: string[] }> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Autenticação do Google Calendar necessária.');
  }

  let syncedCount = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    if (task.completed) continue; // Skip completed tasks
    const res = await syncTaskToGoogleCalendar(task, token);
    if (res.success) {
      syncedCount++;
    } else if (res.error) {
      errors.push(`${task.title}: ${res.error}`);
    }
  }

  return { syncedCount, errors };
}
