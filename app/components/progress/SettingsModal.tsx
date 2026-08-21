import { useState, useEffect } from 'react';
import type { SaveSettings } from '../../services/save-parser/SettingsService';
import type { SaveDrawingResult } from '../../services/save-parser/SaveDrawingParser';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SaveSettings;
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
    settings.version || 'Repentance+'
  );
  const [file, setFile] = useState<number>(settings.file || (settings as any).slot || 1);
  const [drawings, setDrawings] = useState<SaveDrawingResult[]>(saveDrawings);

  useEffect(() => {
    if (isOpen) {
      setVersion(settings.version || 'Repentance+');
      setFile(settings.file || (settings as any).slot || 1);
      setDrawings(saveDrawings);
    }
  }, [isOpen, settings, saveDrawings]);

  if (!isOpen) return null;

  const handleSelectVersion = (newVersion: 'Repentance' | 'Repentance+') => {
    setVersion(newVersion);
    fetch('/api/settings/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: newVersion, file }),
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
      characterMenu: settings.characterMenu || 'normal',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              Ajustes de Sincronización
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
              <i className="bi bi-gear-fill text-neutral-400"></i>
              <span>Archivo de Guardado de Steam</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              1. Versión del Juego
            </label>
            <div className="grid grid-cols-1 gap-2">
              <label
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${version === 'Repentance+'
                  ? 'bg-red-950/40 border-red-600'
                  : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800'
                  }`}
                onClick={() => handleSelectVersion('Repentance+')}
              >
                <input
                  type="radio"
                  name="version"
                  value="Repentance+"
                  checked={version === 'Repentance+'}
                  onChange={() => handleSelectVersion('Repentance+')}
                  className="accent-red-600 w-4 h-4 cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>The Binding of Isaac: Repentance+</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Versión actual con Cooperativo Online oficial (Prefijo "rep+")
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${version === 'Repentance'
                  ? 'bg-red-950/40 border-red-600'
                  : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800'
                  }`}
                onClick={() => handleSelectVersion('Repentance')}
              >
                <input
                  type="radio"
                  name="version"
                  value="Repentance"
                  checked={version === 'Repentance'}
                  onChange={() => handleSelectVersion('Repentance')}
                  className="accent-red-600 w-4 h-4 cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>The Binding of Isaac: Repentance</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Versión base clásica sin cooperativo online (Prefijo "rep_")
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              2. Archivo de Guardado (File)
            </label>
            <div className="bg-neutral-950 px-3 pt-5 pb-3 sm:px-4 sm:pt-6 sm:pb-4 rounded-xl border border-neutral-800 flex items-center justify-center overflow-x-auto">
              <div className="flex items-end justify-center gap-2 sm:gap-4 shrink-0">
                {[
                  { id: 1, name: 'File 1', crop: { x: 0, y: 272, w: 160, h: 208 }, drawingOffset: { left: 18, top: 6 } },
                  { id: 2, name: 'File 2', crop: { x: 160, y: 272, w: 144, h: 208 }, drawingOffset: { left: 4, top: 6 } },
                  { id: 3, name: 'File 3', crop: { x: 304, y: 272, w: 144, h: 208 }, drawingOffset: { left: 11, top: 10 } },
                ].map((f) => {
                  const isSelected = file === f.id;
                  const drawingInfo = drawings.find((d) => d.file === f.id) || {
                    image: '01_basement.png',
                    checkmarks: 0,
                    photoOutline: false,
                  };
                  const activeChecks = CHECKMARK_CONFIGS.slice(0, Math.min(4, drawingInfo.checkmarks));

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleSelectFile(f.id)}
                      className={`relative cursor-pointer focus:outline-none transition-all duration-150 ease-out group ${isSelected ? '-translate-y-2.5' : 'hover:-translate-y-2.5'
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
                          imageRendering: 'pixelated',
                        }}
                        className={`transition-all duration-150 ${isSelected
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
                          imageRendering: 'pixelated',
                          pointerEvents: 'none',
                        }}
                        className={`transition-all duration-150 ${isSelected
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
                              imageRendering: 'pixelated',
                              pointerEvents: 'none',
                            }}
                            className={`transition-all duration-150 ${isSelected
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
                              imageRendering: 'pixelated',
                              pointerEvents: 'none',
                            }}
                            className={`transition-all duration-150 ${isSelected
                              ? `brightness-100 ${c.animClass}`
                              : `brightness-75 group-hover:brightness-100 ${c.idleClass} ${c.hoverClass}`
                              }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
