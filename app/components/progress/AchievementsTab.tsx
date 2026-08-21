import { useState, useRef } from 'react';
import type { AchievementJSON } from '../../services/save-parser/models/Achievement';

interface AchievementsTabProps {
  configured?: boolean;
  achievements: AchievementJSON[];
}

type FilterMode = 'all' | 'unlocked' | 'locked';

export function AchievementsTab({ configured = true, achievements }: AchievementsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementJSON | null>(null);
  const lastWheelTime = useRef<number>(0);

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

  const PAGE_SIZE = 96;
  const totalPages = Math.max(1, Math.ceil(filteredAchievements.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageAchievements = filteredAchievements.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const toggleFilter = (mode: 'unlocked' | 'locked') => {
    setFilter((prev) => (prev === mode ? 'all' : mode));
    setCurrentPage(1);
  };

  const handleSelectAchievement = (ach: AchievementJSON) => {
    setSelectedAchievement((prev) => (prev?.id === ach.id ? null : ach));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (totalPages <= 1) return;
    if (Math.abs(e.deltaY) < 10) return;

    const now = Date.now();
    if (now - lastWheelTime.current < 60) return;
    lastWheelTime.current = now;

    if (e.deltaY > 0) {
      setCurrentPage((p) => Math.min(totalPages, p + 1));
    } else if (e.deltaY < 0) {
      setCurrentPage((p) => Math.max(1, p - 1));
    }
  };

  return (
    <div className="flex-1 min-h-0 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-col overflow-hidden shadow-xl">
      <div className="shrink-0 p-4 sm:p-5 border-b border-neutral-800 flex flex-col gap-3 bg-neutral-950/40">
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar logro..."
                  className="w-44 sm:w-56 px-3.5 py-1.5 pl-8 bg-neutral-950/80 border border-neutral-800 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 font-upheaval tracking-wide focus:outline-none focus:border-red-500 transition-colors"
                />
                <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs"></i>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
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
      </div>

      <div className="flex-1 min-h-0 p-3 sm:p-5 flex flex-col justify-between items-center overflow-y-auto">
        {!configured || achievements.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            Configura tu versión y archivo de guardado para comenzar.
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            No se encontraron logros para este filtro.
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col justify-between items-center gap-3">
            <div className="shrink-0 flex items-center justify-center gap-4 sm:gap-6 select-none pt-1">
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl sm:text-3xl font-upheaval text-gray-200 tracking-wider">
                  Page {safeCurrentPage}
                </h2>
              </div>
            </div>

            <div
              onWheel={handleWheel}
              className="w-full flex-1 flex items-center justify-center overflow-x-auto py-2 select-none"
            >
              <div className="flex items-center gap-4 sm:gap-6 justify-center">
                <div
                  key={safeCurrentPage}
                  className="grid grid-cols-[repeat(16,auto)] gap-1 sm:gap-1.5 justify-items-center shrink-0"
                >
                  {pageAchievements.map((ach, idx) => {
                    const isSelected = selectedAchievement?.id === ach.id;

                    return (
                      <button
                        key={ach.id}
                        type="button"
                        onClick={() => handleSelectAchievement(ach)}
                        className={`animate-stagger p-1 sm:p-1.5 rounded-lg overflow-hidden flex justify-center items-center transition-all duration-150 group shrink-0 cursor-pointer border ${isSelected
                          ? 'bg-white/20 border-red-500 ring-2 ring-red-500/70 shadow-lg scale-105'
                          : 'hover:bg-white/10 border-transparent hover:border-white/10'
                          }`}
                        style={{ animationDelay: `${(idx % 16) * 12}ms` }}
                        data-id={ach.id}
                        title={`#${ach.id} - ${ach.achievement}`}
                      >
                        <img
                          loading="lazy"
                          decoding="async"
                          src={`/Achievements/${ach.sprite}`}
                          alt={ach.achievement}
                          className={`object-contain w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 pixelated transition-all duration-300 select-none ${!ach.unlocked
                            ? 'grayscale opacity-50 group-hover:opacity-75'
                            : 'drop-shadow-md group-hover:scale-105'
                            }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-col items-center justify-center gap-2 select-none shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className={`p-1 text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center ${safeCurrentPage === 1 ? 'invisible pointer-events-none opacity-0' : 'opacity-100'
                        }`}
                      title="Página anterior"
                      aria-label="Página anterior"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 5l-7 8h14l-7-8z" />
                      </svg>
                    </button>

                    <div className="flex flex-col items-center gap-1.5 sm:gap-2 my-1">
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pNum = idx + 1;
                        const isActive = pNum === safeCurrentPage;
                        return (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => setCurrentPage(pNum)}
                            className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex items-center justify-center cursor-pointer select-none group"
                            title={`Página ${pNum}`}
                            aria-label={`Ir a Página ${pNum}`}
                          >
                            <span
                              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ease-in-out block ${isActive
                                ? 'bg-white border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.85)] scale-125'
                                : 'bg-neutral-800 border-2 border-neutral-600 group-hover:border-neutral-400 group-hover:bg-neutral-700 scale-100'
                                }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className={`p-1 text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center ${safeCurrentPage === totalPages ? 'invisible pointer-events-none opacity-0' : 'opacity-100'
                        }`}
                      title="Página siguiente"
                      aria-label="Página siguiente"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 19l7-8H5l7 8z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full max-w-3xl bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3 sm:p-3.5 shadow-inner flex items-center justify-between gap-3 shrink-0 h-24 sm:h-26 overflow-hidden">
              {selectedAchievement ? (
                <>
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="p-2 bg-neutral-900 border border-neutral-800 rounded-2xl shrink-0 flex items-center justify-center">
                      <img
                        src={`/Achievements/${selectedAchievement.sprite}`}
                        alt={selectedAchievement.achievement}
                        className="w-14 h-14 sm:w-16 sm:h-16 pixelated object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded shrink-0">
                          {selectedAchievement.id}
                        </span>
                        <h4 className="text-base sm:text-lg font-upheaval text-white tracking-wide truncate">
                          {selectedAchievement.achievement}
                        </h4>
                        <div className="ml-auto mr-2 shrink-0">
                          {selectedAchievement.unlocked ? (
                            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                              <span>✓</span> Desbloqueado
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-500 italic flex items-center gap-1">
                              <span>✗</span> Bloqueado
                            </span>
                          )}
                        </div>
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
                <div className="flex-1 text-center text-xs text-neutral-500 font-medium italic select-none">
                  Selecciona un logro para ver sus detalles
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
