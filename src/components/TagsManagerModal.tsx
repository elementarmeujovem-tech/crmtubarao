import React, { useState } from 'react';
import { Tag, Contact } from '../types';
import { X, Plus, Trash2, Tag as TagIcon, Check } from 'lucide-react';

interface TagsManagerModalProps {
  tags: Tag[];
  contacts: Contact[];
  onClose: () => void;
  onSaveTag: (tag: Omit<Tag, 'id'> & { id?: string }) => void;
  onDeleteTag: (id: string) => void;
}

const PRESET_COLORS = [
  { name: 'Esmeralda / Casa', color: 'emerald', bgHex: '#d1fae5', textHex: '#047857' },
  { name: 'Azul Céu / Carro', color: 'sky', bgHex: '#e0f2fe', textHex: '#0369a1' },
  { name: 'Índigo / Investimento', color: 'indigo', bgHex: '#e0e7ff', textHex: '#4338ca' },
  { name: 'Rosa / Sem Dinheiro', color: 'rose', bgHex: '#ffe4e6', textHex: '#e11d48' },
  { name: 'Âmbar / Agro', color: 'amber', bgHex: '#fef3c7', textHex: '#b45309' },
  { name: 'Laranja / Caminhão', color: 'orange', bgHex: '#ffedd5', textHex: '#c2410c' },
  { name: 'Roxo / Follow Up', color: 'purple', bgHex: '#f3e8ff', textHex: '#7e22ce' },
  { name: 'Ciano / Analítico', color: 'cyan', bgHex: '#cffafe', textHex: '#0e7490' },
  { name: 'Azul / Direto', color: 'blue', bgHex: '#dbeafe', textHex: '#1d4ed8' },
  { name: 'Ardósia / Técnico', color: 'slate', bgHex: '#f1f5f9', textHex: '#334155' },
  { name: 'Verde Água / Amigo', color: 'teal', bgHex: '#ccfbf1', textHex: '#0f766e' },
  { name: 'Pink / Empolgado', color: 'pink', bgHex: '#fce7f3', textHex: '#be185d' },
];

export const TagsManagerModal: React.FC<TagsManagerModalProps> = ({
  tags,
  contacts,
  onClose,
  onSaveTag,
  onDeleteTag,
}) => {
  const [tagName, setTagName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [tagToDeleteId, setTagToDeleteId] = useState<string | null>(null);

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    const chosenColor = PRESET_COLORS[selectedColorIndex];

    onSaveTag({
      name: tagName.trim(),
      color: chosenColor.color,
      bgHex: chosenColor.bgHex,
      textHex: chosenColor.textHex,
    });

    setTagName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Gerenciar Etiquetas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crie e organize marcadores para segmentar contatos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Tag Form */}
        <form onSubmit={handleCreateTag} className="my-4 space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
          <h3 className="font-bold text-xs text-slate-900 dark:text-white">
            Criar Nova Etiqueta
          </h3>

          <div>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Ex: Em Negociação Especial, Inadimplente..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Cor de Destaque
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {PRESET_COLORS.map((preset, idx) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setSelectedColorIndex(idx)}
                  className={`w-7 h-7 rounded-full shrink-0 border flex items-center justify-center transition-transform ${
                    selectedColorIndex === idx ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: preset.bgHex, borderColor: preset.textHex }}
                >
                  {selectedColorIndex === idx && (
                    <Check className="w-3.5 h-3.5" style={{ color: preset.textHex }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Etiqueta</span>
          </button>
        </form>

        {/* Existing Tags List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400 mb-1">
            Etiquetas Ativas ({tags.length})
          </h3>

          {tags.map((tag) => {
            const count = contacts.filter((c) => c.tagIds.includes(tag.id)).length;

            return (
              <div
                key={tag.id}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-semibold"
                    style={{
                      backgroundColor: tag.bgHex || '#e0e7ff',
                      color: tag.textHex || '#3730a3',
                    }}
                  >
                    {tag.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({count} contato{count !== 1 ? 's' : ''})
                  </span>
                </div>

                {tagToDeleteId === tag.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onDeleteTag(tag.id);
                        setTagToDeleteId(null);
                      }}
                      className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Excluir
                    </button>
                    <button
                      onClick={() => setTagToDeleteId(null)}
                      className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setTagToDeleteId(tag.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Excluir etiqueta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
