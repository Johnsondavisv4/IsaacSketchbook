import { useState, useEffect } from 'react';
import type { SaveSettings } from '../../services/save-parser/SettingsService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SaveSettings;
  saveExists: boolean;
  saveFilename: string;
  onSave: (newSettings: SaveSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  saveExists,
  saveFilename,
  onSave,
}: SettingsModalProps) {
  const [version, setVersion] = useState<'Repentance' | 'Repentance+'>(
    settings.version || 'Repentance+'
  );
  const [slot, setSlot] = useState<number>(settings.slot || 1);
  const [checkStatus, setCheckStatus] = useState<{
    loading: boolean;
    exists: boolean;
    filename: string;
  }>({
    loading: false,
    exists: saveExists,
    filename: saveFilename,
  });

  const calculatedPrefix = version === 'Repentance+' ? 'rep+' : 'rep_';
  const previewFilename = `${calculatedPrefix}persistentgamedata${slot}.dat`;

  useEffect(() => {
    if (isOpen) {
      setVersion(settings.version || 'Repentance+');
      setSlot(settings.slot || 1);
    }
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setCheckStatus((prev) => ({ ...prev, loading: true }));

    fetch('/api/settings/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, slot }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setCheckStatus({
            loading: false,
            exists: Boolean(data.exists),
            filename: data.filename || previewFilename,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setCheckStatus((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, version, slot, previewFilename]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      version,
      slot,
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
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              Ajustes de Sincronización
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              ⚙️ Archivo de Guardado de Steam
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Version Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              1. Versión del Juego
            </label>
            <div className="grid grid-cols-1 gap-2">
              <label
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  version === 'Repentance+'
                    ? 'bg-red-950/40 border-red-600'
                    : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                <input
                  type="radio"
                  name="version"
                  value="Repentance+"
                  checked={version === 'Repentance+'}
                  onChange={() => setVersion('Repentance+')}
                  className="accent-red-600 w-4 h-4 cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>🟢</span> The Binding of Isaac: Repentance+
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Versión actual con Cooperativo Online oficial (Prefijo "rep+")
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  version === 'Repentance'
                    ? 'bg-red-950/40 border-red-600'
                    : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                <input
                  type="radio"
                  name="version"
                  value="Repentance"
                  checked={version === 'Repentance'}
                  onChange={() => setVersion('Repentance')}
                  className="accent-red-600 w-4 h-4 cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>🔴</span> The Binding of Isaac: Repentance
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Versión base clásica sin cooperativo online (Prefijo "rep_")
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Slot Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
              2. Slot de Guardado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((s) => (
                <label
                  key={s}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    slot === s
                      ? 'bg-red-950/50 border-red-600 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={s}
                    checked={slot === s}
                    onChange={() => setSlot(s)}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold">Slot {s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview Box */}
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Archivo calculado:</span>
              <code className="font-mono text-white font-bold bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                {checkStatus.filename || previewFilename}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Estado en Steam:</span>
              <span
                className={`font-semibold ${
                  checkStatus.loading
                    ? 'text-neutral-400'
                    : checkStatus.exists
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {checkStatus.loading
                  ? '🔍 Comprobando...'
                  : checkStatus.exists
                  ? '✔️ Encontrado en Steam'
                  : '⚠️ No encontrado en Steam'}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-600 rounded-lg shadow transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>Guardar Configuración</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
