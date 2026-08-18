import type { AchievementJSON } from '../../services/save-parser/models/Achievement';

interface AchievementsTabProps {
  configured?: boolean;
  achievements: AchievementJSON[];
}

export function AchievementsTab({ configured = true, achievements }: AchievementsTabProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="flex-1 min-h-0 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-col overflow-hidden shadow-xl">
      <div className="shrink-0 p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
        <div>
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-0.5">
            Logros (Secretos)
          </span>
          <p className="text-xs text-neutral-400">
            Listado completo de logros con sus requisitos de desbloqueo oficiales.
          </p>
        </div>
        {configured && (
          <div className="text-xs font-mono font-bold bg-neutral-950 border border-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-emerald-400">{unlockedCount}</span> / {achievements.length} Desbloqueados
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-neutral-800 p-2">
        {!configured || achievements.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            Configura tu versión y slot de guardado para comenzar.
          </div>
        ) : (
          achievements.map((ach) => (
            <div
              key={ach.id}
              className="flex items-center justify-between py-2.5 px-3 hover:bg-neutral-950/40 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0 pr-3">
                <span className="text-xs font-mono text-neutral-500 w-8">
                  #{ach.id}
                </span>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-bold ${
                      ach.unlocked ? 'text-white' : 'text-neutral-500'
                    } truncate`}
                  >
                    {ach.achievement}
                  </div>
                  {ach.unlock && (
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {ach.unlock}
                    </div>
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border shrink-0 ${
                  ach.unlocked
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                }`}
              >
                {ach.unlocked ? 'Desbloqueado' : 'Bloqueado'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
