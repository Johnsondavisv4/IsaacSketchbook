import { useState } from 'react';
import type { ItemJSON } from '../../services/save-parser/models/Item';

interface ItemsTabProps {
  configured: boolean;
  items: ItemJSON[];
}

type FilterMode = 'all' | 'seen' | 'not_seen';

export function ItemsTab({ configured, items }: ItemsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterMode>('all');

  const validItems = items.filter((i) => i.id > 0);
  const seenCount = validItems.filter((i) => i.seen).length;
  const notSeenCount = validItems.length - seenCount;

  const filteredItems = validItems.filter((item) => {
    if (filter === 'seen') return item.seen;
    if (filter === 'not_seen') return !item.seen;
    return true;
  });

  const PAGE_SIZE = 120;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageItems = filteredItems.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const toggleFilter = (mode: 'seen' | 'not_seen') => {
    setFilter((prev) => (prev === mode ? 'all' : mode));
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 min-h-0 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-col overflow-hidden shadow-xl">
      {/* Top Header & Filter Controls */}
      <div className="shrink-0 p-4 sm:p-5 border-b border-neutral-800 flex flex-col gap-3 bg-neutral-950/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-upheaval text-neutral-200 tracking-wide">
              Items
            </h2>
            {configured && (
              <div className="text-xs font-mono font-bold bg-neutral-950 border border-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg shadow-sm">
                <span className="text-amber-400">{seenCount}</span> / {validItems.length} Vistos
              </div>
            )}
          </div>

          {configured && (
            <div className="flex items-center gap-2 font-upheaval text-sm sm:text-base tracking-wide">
              {/* Seen Filter Button */}
              <button
                type="button"
                onClick={() => toggleFilter('seen')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${filter === 'seen'
                  ? 'bg-white/10 text-white border-white/40 shadow-sm ring-1 ring-white/30'
                  : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`}
                title={filter === 'seen' ? 'Quitar filtro (Mostrar todos)' : 'Filtrar solo Vistos'}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${filter === 'seen' ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-white/70'}`} />
                <span>Seen</span>
                <span className="font-mono text-xs opacity-80">({seenCount})</span>
              </button>

              {/* Not Seen Filter Button */}
              <button
                type="button"
                onClick={() => toggleFilter('not_seen')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${filter === 'not_seen'
                  ? 'bg-white/10 text-white border-white/40 shadow-sm ring-1 ring-white/30'
                  : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`}
                title={filter === 'not_seen' ? 'Quitar filtro (Mostrar todos)' : 'Filtrar solo No vistos'}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${filter === 'not_seen' ? 'bg-neutral-300 shadow-[0_0_6px_rgba(255,255,255,0.4)]' : 'bg-neutral-600'}`} />
                <span>Not seen</span>
                <span className="font-mono text-xs opacity-80">({notSeenCount})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Single Page View Area */}
      <div className="flex-1 min-h-0 p-3 sm:p-5 flex flex-col justify-between items-center overflow-y-auto">
        {!configured || validItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            Configura tu versión y slot de guardado para comenzar.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            No se encontraron items para este filtro.
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col justify-between items-center gap-3">
            {/* Page Title with Left / Right SVG Navigation Arrows */}
            <div className="shrink-0 flex items-center justify-center gap-4 sm:gap-6 select-none pt-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Página anterior"
                aria-label="Página anterior"
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl sm:text-3xl font-upheaval text-gray-200 tracking-wider">
                  Page {safeCurrentPage}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* 20-Column Grid Container (centered vertically and horizontally) */}
            <div className="w-full flex-1 flex items-center justify-center overflow-x-auto py-2">
              <div className="grid grid-cols-[repeat(20,auto)] gap-1 sm:gap-1.5 justify-items-center shrink-0">
                {pageItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-1 sm:p-1.5 rounded overflow-hidden flex justify-center items-center transition-colors group shrink-0"
                    data-id={item.id}
                  >
                    <img
                      loading="lazy"
                      decoding="async"
                      src={`/Items/${item.sprite}`}
                      alt={item.name}
                      className={`object-contain w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 pixelated transition-all duration-300 select-none ${!item.seen
                        ? 'grayscale opacity-50 group-hover:opacity-75'
                        : 'drop-shadow-md group-hover:scale-105'
                        }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Dots at Bottom (only when multiple pages exist) */}
            {totalPages > 1 && (
              <div className="shrink-0 flex items-center justify-center gap-2.5 pb-1 select-none">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isActive = pNum === safeCurrentPage;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`transition-all duration-200 cursor-pointer rounded-full ${isActive
                        ? 'w-6 h-2.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]'
                        : 'w-2.5 h-2.5 bg-neutral-700 hover:bg-neutral-500'
                        }`}
                      title={`Página ${pNum}`}
                      aria-label={`Ir a Página ${pNum}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
