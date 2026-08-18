import { useState } from 'react';
import type { ItemJSON } from '../../services/save-parser/models/Item';

interface ItemsTabProps {
  configured: boolean;
  items: ItemJSON[];
}

export function ItemsTab({ configured, items }: ItemsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const validItems = items.filter((i) => i.id > 0);
  const seenCount = validItems.filter((i) => i.seen).length;

  const PAGE_SIZE = 120;
  const totalPages = Math.max(1, Math.ceil(validItems.length / PAGE_SIZE));

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageItems = validItems.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  return (
    <div className="flex-1 min-h-0 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-col overflow-hidden shadow-xl">
      {/* Top Header & Legend (Read-Only Status View) */}
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
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                <span>Seen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-600" />
                <span>Not seen (greyed)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Single Page View Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
        {!configured || validItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-sm font-medium">
            Configura tu versión y slot de guardado para comenzar.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Single Active Page Card */}
            <div className="border border-white/10 bg-black/20 backdrop-blur-sm shadow-lg flex flex-col rounded-3xl gap-3 p-4 md:p-6 items-center">
              {/* Page Title with Left / Right SVG Navigation Arrows */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 select-none">
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

                <h2 className="text-2xl sm:text-3xl font-upheaval text-gray-200 tracking-wider">
                  Page {safeCurrentPage}
                </h2>

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

              {/* 20-Column Grid Container (exact w-10 sm:w-16 size from Isaac-save-manager) */}
              <div className="w-full overflow-x-auto flex justify-center py-1">
                <div className="grid grid-cols-[repeat(20,auto)] gap-0.5 sm:gap-1 justify-items-center shrink-0">
                  {pageItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-1 sm:p-2 rounded overflow-hidden flex justify-center items-center transition-colors group shrink-0"
                      title={`#${item.id} - ${item.name} (${item.seen ? 'Seen' : 'Not seen'})`}
                      data-id={item.id}
                    >
                      <img
                        loading="lazy"
                        decoding="async"
                        src={`/Items/${item.sprite}`}
                        alt={item.name}
                        className={`object-cover w-10 h-10 sm:w-16 sm:h-16 pixelated transition-all duration-300 select-none ${
                          !item.seen
                            ? 'grayscale opacity-50 group-hover:opacity-75'
                            : 'drop-shadow-md group-hover:scale-105'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination Dots at Bottom */}
              <div className="flex items-center justify-center gap-2 pt-2 pb-1 select-none">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isActive = pNum === safeCurrentPage;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`transition-all duration-200 cursor-pointer rounded-full ${
                        isActive
                          ? 'w-6 h-2.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]'
                          : 'w-2.5 h-2.5 bg-neutral-700 hover:bg-neutral-500'
                      }`}
                      title={`Página ${pNum}`}
                      aria-label={`Ir a Página ${pNum}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
