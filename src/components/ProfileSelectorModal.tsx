import React from 'react';
import { X, Wrench, Zap, Paintbrush, Hammer, Check, Sparkles, FolderKanban } from 'lucide-react';
import { ProfileMeta } from '../types';

interface ProfileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ProfileMeta[];
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  estimateItemCount: number;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="w-6 h-6" />,
  Zap: <Zap className="w-6 h-6" />,
  Paintbrush: <Paintbrush className="w-6 h-6" />,
  Hammer: <Hammer className="w-6 h-6" />,
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
  sky: {
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/40',
    text: 'text-sky-400',
    lightBg: 'group-hover:border-sky-500/60',
  },
  amber: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    lightBg: 'group-hover:border-amber-500/60',
  },
  emerald: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    lightBg: 'group-hover:border-emerald-500/60',
  },
  orange: {
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    lightBg: 'group-hover:border-orange-500/60',
  },
};

export const ProfileSelectorModal: React.FC<ProfileSelectorModalProps> = ({
  isOpen,
  onClose,
  profiles,
  selectedProfileId,
  onSelectProfile,
  estimateItemCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Профили деятельности</h2>
              <p className="text-xs text-slate-400">Выберите сферу работ для загрузки соответствующего каталога</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto pr-1 flex-1 py-1">
          {profiles.map((profile) => {
            const isSelected = profile.id === selectedProfileId;
            const theme = COLOR_MAP[profile.color] || COLOR_MAP.sky;
            const icon = ICONS_MAP[profile.icon] || <Wrench className="w-6 h-6" />;

            return (
              <div
                key={profile.id}
                onClick={() => {
                  onSelectProfile(profile.id);
                  onClose();
                }}
                className={`group relative rounded-xl border p-4 text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-500/70 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                    <Check className="w-3 h-3" />
                    <span>Активен</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${theme.bg} ${theme.border} ${theme.text}`}>
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">
                        {profile.name}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-400">
                        {profile.categories.length} категорий каталога
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-2">
                    {profile.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-700/40 mt-auto">
                  <div className="flex flex-wrap gap-1">
                    {profile.categories.slice(0, 3).map((cat, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-slate-400 font-medium"
                      >
                        {cat}
                      </span>
                    ))}
                    {profile.categories.length > 3 && (
                      <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-slate-500">
                        +{profile.categories.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Каталог сохраняется локально и доступен офлайн без интернета</span>
          </div>
          {estimateItemCount > 0 && (
            <span className="text-slate-400 text-[11px]">
              В текущей смете {estimateItemCount} поз. (сохраняются при смене)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
