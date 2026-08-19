import { useState } from 'react';
import type { AchievementJSON } from '../../services/save-parser/models/Achievement';

interface AchievementsTabProps {
  configured?: boolean;
  achievements: AchievementJSON[];
}

type FilterMode = 'all' | 'unlocked' | 'locked';

export function AchievementsTab({ configured = true, achievements }: AchievementsTabProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementJSON | null>(null);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const lockedCount = achievements.length - unlockedCount;

  const filteredAchievements = achievements.filter((ach) => {
    if (filter === 'unlocked' && !ach.unlocked) return false;
    if (filter === 'locked' && ach.unlocked) return false;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchId = String(ach.id).includes(q);
      const matchName = ach.achievement.toLowerCase().includes(q);
      const matchUnlock = (ach.unlock ?? '').toLowerCase().includes(q);
      return matchId || matchName || matchUnlock;
    }

    return true;
  });

  const toggleFilter = (mode: 'unlocked' | 'locked') => {
    setFilter((prev) => (prev === mode ? 'all' : mode));
  };

  const handleSelectAchievement = (ach: AchievementJSON) => {
    setSelectedAchievement((prev) => (prev?.id === ach.id ? null : ach));
  };

  return (
    <div className="flex-1 min-h-0 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-col overflow-hidden shadow-xl">
      <div className="shrink-0 p-4 sm:p-5 border-b border-neutral-800 flex flex-col gap-4 bg-neutral-950/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-upheaval text-neutral-200 tracking-wide">
              Achievements
            </h2>
            {configured && (
              <div className="text-xs font-mono font-bold bg-neutral-950 border border-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg shadow-sm">
                <span className="text-amber-400">{unlockedCount}</span> / {achievements.length} Desbloqueados
              </div>
            )}
          </div>

          {configured && (
            <div className="flex flex-wrap items-center gap-2.5 font-upheaval text-sm sm:text-base tracking-wide">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar logro..."
                  className="w-44 sm:w-56 px-3.5 py-1.5 pl-8 bg-neutral-950/80 border border-neutral-800 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 font-upheaval tracking-wide focus:outline-none focus:border-red-500 transition-colors"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-sans">
                  🔍
                </span>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs cursor-pointer font-sans"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggleFilter('unlocked')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${filter === 'unlocked'
                    ? 'bg-white/10 text-white border-white/40 shadow-sm ring-1 ring-white/30'
                    : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`}
                title={filter === 'unlocked' ? 'Quitar filtro (Mostrar todos)' : 'Filtrar solo Desbloqueados'}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${filter === 'unlocked' ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-white/70'}`} />
                <span>Unlocked</span>
                <span className="font-mono text-xs opacity-80">({unlockedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => toggleFilter('locked')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${filter === 'locked'
                    ? 'bg-white/10 text-white border-white/40 shadow-sm ring-1 ring-white/30'
                    : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`}
                title={filter === 'locked' ? 'Quitar filtro (Mostrar todos)' : 'Filtrar solo Bloqueados'}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${filter === 'locked' ? 'bg-neutral-300 shadow-[0_0_6px_rgba(255,255,255,0.4)]' : 'bg-neutral-600'}`} />
                <span>Locked</span>
                <span className="font-mono text-xs opacity-80">({lockedCount})</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-3 bg-neutral-950/90 border border-neutral-800 rounded-2xl flex items-center justify-between gap-3 shadow-inner h-24 sm:h-26 shrink-0 overflow-hidden">
          {selectedAchievement ? (
            <>
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="p-2 bg-neutral-900 border border-neutral-800 rounded-2xl shrink-0 flex items-center justify-center">
                  <img
                    src={`/Achievements/${selectedAchievement.sprite}`}
                    alt={selectedAchievement.achievement}
                    className={`w-14 h-14 sm:w-16 sm:h-16 pixelated object-contain ${
                      !selectedAchievement.unlocked
                        ? 'grayscale opacity-50'
                        : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                    }`}
                  />
                </div>

                <div className="flex flex-col min-w-0 flex-1 justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded shrink-0">
                      {selectedAchievement.id}
                    </span>
                    <h4 className="text-base font-upheaval text-white tracking-wide truncate">
                      {selectedAchievement.achievement}
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5 leading-snug font-sans font-medium line-clamp-2">
                    <span className="text-red-400 font-bold mr-1">Desbloqueo:</span>
                    {selectedAchievement.unlock || 'Requisito especial de desbloqueo no disponible.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Cerrar detalle"
              >
                ✕
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3.5 min-w-0 w-full">
              <div className="w-18 h-18 sm:w-20 sm:h-20 p-2 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl shrink-0 flex items-center justify-center text-neutral-600 text-xl sm:text-2xl select-none">
                🏆
              </div>
              <div className="flex flex-col min-w-0 justify-center">
                <h4 className="text-sm font-upheaval text-neutral-400 tracking-wide">
                  Inspeccionar Logro
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5 leading-snug font-sans">
                  Haz clic en cualquier logro de la lista para ver su requisito oficial de desbloqueo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
        {!configured || achievements.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            Configura tu versión y slot de guardado para comenzar.
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            No se encontraron logros que coincidan con la búsqueda o filtro.
          </div>
        ) : (
          <div className="w-full flex flex-wrap gap-2 sm:gap-3 justify-center">
            {filteredAchievements.map((ach) => {
              const isSelected = selectedAchievement?.id === ach.id;

              return (
                <button
                  key={ach.id}
                  type="button"
                  onClick={() => handleSelectAchievement(ach)}
                  className={`p-2 rounded-2xl transition-all duration-150 hover:scale-105 shadow-md flex items-center justify-center cursor-pointer group shrink-0 border ${
                    isSelected
                      ? 'bg-white/20 border-red-500 ring-2 ring-red-500/70 shadow-xl'
                      : 'bg-black/20 hover:bg-white/10 border-white/5 hover:border-white/20'
                  }`}
                  data-id={ach.id}
                  title={`#${ach.id} - ${ach.achievement}`}
                >
                  <img
                    loading="lazy"
                    decoding="async"
                    src={`/Achievements/${ach.sprite}`}
                    alt={ach.achievement}
                    className={`w-14 h-14 sm:w-16 sm:h-16 pixelated object-contain transition-all duration-300 select-none ${!ach.unlocked
                        ? 'grayscale opacity-40 group-hover:opacity-75'
                        : 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                      }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
