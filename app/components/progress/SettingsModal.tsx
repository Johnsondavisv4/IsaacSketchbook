import { useState, useEffect } from 'react';
import type { SaveSettings } from '../../services/save-parser/SettingsService';
import type { SaveDrawingResult } from '../../services/save-parser/SaveDrawingParser';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: SaveSettings | null;
  saveExists?: boolean;
  saveFilename?: string;
  saveDrawings?: SaveDrawingResult[];
  onSave: (newSettings: SaveSettings) => void;
}

const CHECKMARK_CONFIGS = [
  { id: 1, left: 26, top: 24, idleClass: 'check1-idle', animClass: 'check1-animated', hoverClass: 'check1-hover-animated' },
  { id: 2, left: 35, top: 21, idleClass: 'check2-idle', animClass: 'check2-animated', hoverClass: 'check2-hover-animated' },
  { id: 3, left: 43, top: 19, idleClass: 'check3-idle', animClass: 'check3-animated', hoverClass: 'check3-hover-animated' },
  { id: 4, left: 53, top: 17, idleClass: 'check4-idle', animClass: 'check4-animated', hoverClass: 'check4-hover-animated' },
];

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  saveDrawings = [],
  onSave,
}: SettingsModalProps) {
  const [version, setVersion] = useState<'Repentance' | 'Repentance+'>(
    settings?.version || 'Repentance+'
  );
  const [file, setFile] = useState<number | null>(settings?.file ?? null);
  const [drawings, setDrawings] = useState<SaveDrawingResult[]>(saveDrawings);

  useEffect(() => {
    if (isOpen) {
      setVersion(settings?.version || 'Repentance+');
      setFile(settings?.file ?? null);
      setDrawings(saveDrawings);
    }
  }, [isOpen, settings, saveDrawings]);

  if (!isOpen) return null;

  const handleSelectVersion = (newVersion: 'Repentance' | 'Repentance+') => {
    setVersion(newVersion);
    fetch('/api/settings/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: newVersion, file: file || 1 }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.drawings)) {
          setDrawings(data.drawings);
        }
      })
      .catch((err) => console.error('Error fetching drawings:', err));
  };

  const handleSelectFile = (newFile: number) => {
    setFile(newFile);
    onSave({
      version,
      file: newFile,
      characterMenu: settings?.characterMenu || 'normal',
    });
    onClose();
  };

  const scale = 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md transition-opacity overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-fit max-w-[96vw] bg-neutral-900 border border-neutral-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all flex flex-col gap-4 my-auto mx-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-500 shadow-inner shrink-0">
              <i className="bi bi-file-earmark-person-fill text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide font-upheaval leading-tight">
                Seleccionar Partida
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Haz clic en uno de los archivos para sincronizar automáticamente tu progreso de Steam
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            <div className="inline-flex p-1 bg-neutral-950/90 border border-neutral-800 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => handleSelectVersion('Repentance+')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  version === 'Repentance+'
                    ? 'bg-red-700 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                }`}
              >
                <i className="bi bi-globe2 text-xs"></i>
                <span>Repentance+</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectVersion('Repentance')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                  version === 'Repentance'
                    ? 'bg-red-700 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
                }`}
              >
                <i className="bi bi-hdd-fill text-xs"></i>
                <span>Repentance</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/60 rounded-xl transition-colors cursor-pointer shrink-0 text-base"
              title="Cerrar ventana"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center overflow-x-auto max-w-full py-4 sm:py-6">
          <div className="flex items-end justify-center gap-6 sm:gap-8 shrink-0">
            {[
              { id: 1, name: 'File 1', crop: { x: 10, y: 272, w: 144, h: 193 }, drawingOffset: { left: 8, top: 6 } },
              { id: 2, name: 'File 2', crop: { x: 160, y: 272, w: 144, h: 193 }, drawingOffset: { left: 4, top: 6 } },
              { id: 3, name: 'File 3', crop: { x: 304, y: 272, w: 144, h: 193 }, drawingOffset: { left: 11, top: 10 } },
            ].map((f) => {
              const isSelected = file !== null && file === f.id;
              const drawingInfo = drawings.find((d) => d.file === f.id) || {
                image: '01_basement.png',
                checkmarks: 0,
                photoOutline: false,
              };
              const activeChecks = CHECKMARK_CONFIGS.slice(0, Math.min(4, drawingInfo.checkmarks));

              return (
                <div
                  key={f.id}
                  style={{
                    width: `${Math.round(f.crop.w * scale)}px`,
                    height: `${Math.round(f.crop.h * scale)}px`,
                  }}
                  className="relative shrink-0 flex items-end justify-center"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectFile(f.id)}
                    style={{
                      width: `${f.crop.w}px`,
                      height: `${f.crop.h}px`,
                      transform: `scale(${scale})`,
                      transformOrigin: 'bottom left',
                    }}
                    className={`absolute left-0 bottom-0 cursor-pointer focus:outline-none transition-transform duration-150 ease-out group ${isSelected ? '-translate-y-5' : 'hover:-translate-y-5'
                      }`}
                    title={`Seleccionar ${f.name}`}
                  >
                    <div
                      style={{
                        width: `${f.crop.w}px`,
                        height: `${f.crop.h}px`,
                        backgroundImage: "url('/saveselectmenu.png')",
                        backgroundPosition: `-${f.crop.x}px -${f.crop.y}px`,
                        backgroundSize: '480px 556px',
                        backgroundRepeat: 'no-repeat',
                      }}
                      className={`nearest-neighbor transition-all duration-150 ${isSelected
                        ? 'brightness-100'
                        : 'brightness-75 group-hover:brightness-100'
                        }`}
                    />

                    <div
                      style={{
                        position: 'absolute',
                        left: `${f.drawingOffset.left}px`,
                        top: `${f.drawingOffset.top}px`,
                        width: '128px',
                        height: '144px',
                        backgroundImage: `url('/Savedrawings/${drawingInfo.image.toLowerCase()}')`,
                        backgroundSize: '256px 144px',
                        backgroundRepeat: 'no-repeat',
                        pointerEvents: 'none',
                      }}
                      className={`nearest-neighbor transition-all duration-150 ${isSelected
                        ? 'brightness-100 save-drawing-animated'
                        : 'brightness-75 group-hover:brightness-100 save-drawing-idle save-drawing-hover-animated'
                        }`}
                    >
                      {drawingInfo.photoOutline && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '128px',
                            height: '144px',
                            backgroundImage: "url('/Savedrawings/12_photooutline.png')",
                            backgroundSize: '256px 144px',
                            backgroundRepeat: 'no-repeat',
                            pointerEvents: 'none',
                          }}
                          className={`nearest-neighbor transition-all duration-150 ${isSelected
                            ? 'brightness-100 save-drawing-animated'
                            : 'brightness-75 group-hover:brightness-100 save-drawing-idle save-drawing-hover-animated'
                            }`}
                        />
                      )}

                      {activeChecks.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            position: 'absolute',
                            left: `${c.left}px`,
                            top: `${c.top}px`,
                            width: '16px',
                            height: '16px',
                            backgroundImage: "url('/Savedrawings/momsheartcheckmarks.png')",
                            backgroundSize: '64px 16px',
                            backgroundRepeat: 'no-repeat',
                            pointerEvents: 'none',
                          }}
                          className={`nearest-neighbor transition-all duration-150 ${isSelected
                            ? `brightness-100 ${c.animClass}`
                            : `brightness-75 group-hover:brightness-100 ${c.idleClass} ${c.hoverClass}`
                            }`}
                        />
                      ))}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
