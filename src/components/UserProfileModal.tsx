import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Building, 
  Briefcase, 
  Phone, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  KeyRound,
  UserCheck,
  Camera,
  Upload,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { User } from '../types';
import { storageService } from '../services/storage';
import { 
  signInWithGoogleCalendar, 
  getConnectedGoogleUser, 
  signOutGoogleCalendar, 
  syncAllTasksToGoogleCalendar, 
  getGoogleAccessToken 
} from '../services/googleCalendarSync';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updated: User) => void;
  onLogout: () => void;
}

// Preset ready-to-use profile avatars
const PRESET_AVATARS = [
  { id: 'av1', label: 'Gestora Executiva', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80' },
  { id: 'av2', label: 'Consultor Comercial', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80' },
  { id: 'av3', label: 'Especialista Negócios', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=250&auto=format&fit=crop&q=80' },
  { id: 'av4', label: 'Gerente de Contas', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80' },
  { id: 'av5', label: 'Líder Comercial', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=250&auto=format&fit=crop&q=80' },
  { id: 'av6', label: 'Analista de Vendas', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&auto=format&fit=crop&q=80' },
  { id: 'av7', label: 'Avatar 3D Tech', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9' },
  { id: 'av8', label: 'Avatar Ilustrado', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=ffd5dc,ffdfbf' },
  { id: 'av9', label: 'Avatar Minimalista', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=SomaCRM' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onUpdateUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'photo' | 'security' | 'google'>('profile');
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit fields
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [company, setCompany] = useState(user.company || '');
  const [role, setRole] = useState(user.role || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Google Calendar per profile state
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
      // Save google email in user profile
      const updated = storageService.updateCurrentUser({ 
        googleEmail: res.user.email || undefined,
        googleCalendarConnected: true 
      });
      if (updated) onUpdateUser(updated);

      setGoogleSyncMsg({ type: 'success', text: `Perfil vinculado com sucesso ao Google Agenda (${res.user.email})!` });
    } catch (err: any) {
      setGoogleSyncMsg({ type: 'error', text: err?.message || 'Falha ao conectar com o Google Calendar.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    await signOutGoogleCalendar();
    setGoogleUser(null);
    const updated = storageService.updateCurrentUser({ 
      googleEmail: undefined,
      googleCalendarConnected: false 
    });
    if (updated) onUpdateUser(updated);
    setGoogleSyncMsg({ type: 'success', text: 'Conta do Google Agenda desvinculada deste perfil.' });
  };

  const handleSyncProfileTasks = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      setGoogleSyncMsg({ type: 'error', text: 'Conecte sua conta do Google Calendar neste perfil primeiro.' });
      return;
    }

    setIsGoogleLoading(true);
    setGoogleSyncMsg(null);
    try {
      const tasks = storageService.getTasks({ status: 'upcoming' }).concat(storageService.getTasks({ status: 'today' }));
      if (tasks.length === 0) {
        setGoogleSyncMsg({ type: 'error', text: 'Nenhuma tarefa ou retorno pendente para sincronizar.' });
        setIsGoogleLoading(false);
        return;
      }

      const result = await syncAllTasksToGoogleCalendar(tasks);
      if (result.syncedCount > 0) {
        setGoogleSyncMsg({ 
          type: 'success', 
          text: `${result.syncedCount} tarefa(s) do seu perfil enviada(s) para o Google Agenda!` 
        });
      } else {
        setGoogleSyncMsg({ type: 'error', text: 'Nenhuma tarefa nova foi sincronizada. Erro: ' + (result.errors[0] || '') });
      }
    } catch (err: any) {
      setGoogleSyncMsg({ type: 'error', text: err?.message || 'Erro ao sincronizar com o Google Calendar.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Status
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helper to resize image and convert to compact Base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFeedbackMessage({ type: 'error', text: 'Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFeedbackMessage({ type: 'error', text: 'A imagem deve ter menos de 10MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(dataUrl);

          // Auto-save photo change
          const updated = storageService.updateCurrentUser({ avatarUrl: dataUrl });
          if (updated) {
            onUpdateUser(updated);
            setFeedbackMessage({ type: 'success', text: 'Foto de perfil atualizada com sucesso!' });
            setTimeout(() => setFeedbackMessage(null), 3000);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectPreset = (url: string) => {
    setAvatarUrl(url);
    const updated = storageService.updateCurrentUser({ avatarUrl: url });
    if (updated) {
      onUpdateUser(updated);
      setFeedbackMessage({ type: 'success', text: 'Avatar selecionado com sucesso!' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;

    setAvatarUrl(customUrlInput.trim());
    const updated = storageService.updateCurrentUser({ avatarUrl: customUrlInput.trim() });
    if (updated) {
      onUpdateUser(updated);
      setFeedbackMessage({ type: 'success', text: 'Link da imagem aplicado com sucesso!' });
      setCustomUrlInput('');
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    const updated = storageService.updateCurrentUser({ avatarUrl: '' });
    if (updated) {
      onUpdateUser(updated);
      setFeedbackMessage({ type: 'success', text: 'Foto removida. Suas iniciais serão exibidas.' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    if (!name.trim() || !email.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Nome e e-mail não podem ficar vazios.' });
      return;
    }

    const updated = storageService.updateCurrentUser({
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      role: role.trim(),
      phone: phone.trim(),
      avatarUrl: avatarUrl.trim(),
    });

    if (updated) {
      onUpdateUser(updated);
      setFeedbackMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    if (!newPassword || newPassword.length < 4) {
      setFeedbackMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 4 caracteres.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setFeedbackMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
      return;
    }

    const res = await storageService.changePassword(user.id, currentPassword, newPassword);
    if (res.success) {
      setFeedbackMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setFeedbackMessage({ type: 'error', text: res.error || 'Erro ao alterar a senha.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Hidden File Input for Image Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInputChange} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Modal Header with Interactive Avatar */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-6 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            {/* Clickable Avatar Container */}
            <div className="relative group cursor-pointer" onClick={() => setActiveTab('photo')}>
              <div className="w-18 h-18 rounded-2xl bg-white/20 border-2 border-white/60 flex items-center justify-center text-white text-2xl font-black shadow-lg overflow-hidden shrink-0 transition-transform group-hover:scale-105">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={user.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>

              {/* Camera Hover Badge */}
              <div 
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200 dark:border-slate-700 transition-all hover:scale-110"
                title="Clique para trocar a foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold truncate leading-tight">{user.name}</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  {user.role || 'Usuário'}
                </span>
              </div>
              <p className="text-xs text-indigo-100 truncate mt-0.5">{user.email}</p>
              
              {/* Quick photo change shortcut */}
              <button
                type="button"
                onClick={() => setActiveTab('photo')}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg backdrop-blur-sm transition-colors cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>Trocar Foto</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-4 pt-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setFeedbackMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Meus Dados</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('photo');
              setFeedbackMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'photo'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto de Perfil</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              setFeedbackMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'google'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>Google Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('security');
              setFeedbackMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Segurança & Senha</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Feedback Alerts */}
          {feedbackMessage && (
            <div
              className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
          )}

          {/* ============ PHOTO TAB ============ */}
          {activeTab === 'photo' && (
            <div className="space-y-4">
              {/* Active Photo Preview & Fast Actions */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xl font-black overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Foto atual" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Foto Atual</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {avatarUrl ? 'Foto personalizada ativa' : 'Exibindo iniciais do nome'}
                    </p>
                  </div>
                </div>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Remover foto e voltar para iniciais"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remover</span>
                  </button>
                )}
              </div>

              {/* Upload Dropzone / File Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enviar foto do seu dispositivo
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-5 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Clique para escolher ou arraste a imagem aqui
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Suporta JPG, PNG ou WebP (redimensionamento automático otimizado)
                  </p>
                </div>
              </div>

              {/* Ready-made Avatars Gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Escolher um Avatar Pronto</span>
                  </label>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`p-1.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center group cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/60'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 relative">
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate w-full px-0.5">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image URL Input */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <form onSubmit={handleApplyCustomUrl} className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ou cole o link de uma imagem da web (URL)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <LinkIcon className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="url"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/minha-foto.jpg"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!customUrlInput.trim()}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                    >
                      Aplicar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============ PROFILE TAB ============ */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Empresa
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Building className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Empresa"
                      className="w-full pl-8 pr-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cargo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Cargo"
                      className="w-full pl-8 pr-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          )}

          {/* ============ GOOGLE AGENDA PER-PROFILE TAB ============ */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-sky-900 dark:text-sky-200">
                    <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Google Agenda Individual do Perfil</span>
                  </div>
                  {googleUser || user.googleEmail ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      Conectado
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                      Não Vinculado
                    </span>
                  )}
                </div>

                <p className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
                  Cada perfil de consultor ou gestor pode conectar sua própria conta do Google (e-mail) para sincronizar suas tarefas e retornos comerciais diretamente com sua agenda pessoal do Google.
                </p>

                {(googleUser?.email || user.googleEmail) && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">E-mail Google Conectado:</span>
                      <strong className="text-sky-600 dark:text-sky-400">{googleUser?.email || user.googleEmail}</strong>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      Ativo
                    </span>
                  </div>
                )}

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

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {googleUser ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSyncProfileTasks}
                        disabled={isGoogleLoading}
                        className="px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGoogleLoading ? 'animate-spin' : ''}`} />
                        <span>{isGoogleLoading ? 'Sincronizando...' : 'Sincronizar Minhas Tarefas com Google Agenda'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGoogleDisconnect}
                        disabled={isGoogleLoading}
                        className="px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        Desconectar Conta
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleConnect}
                      disabled={isGoogleLoading}
                      className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 w-full justify-center"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      <span>{isGoogleLoading ? 'Conectando...' : 'Vincular Google Agenda ao Meu Perfil'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============ SECURITY & PASSWORD TAB ============ */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>Para sua segurança, defina uma senha forte com no mínimo 4 dígitos.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Senha Atual
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite a senha atual"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Atualizar Senha
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer with Logout Button */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {isConfirmingLogout ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Confirmar encerramento de sessão?
              </span>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                Sim, Desconectar
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingLogout(false)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingLogout(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta (Logout)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer ml-auto"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

