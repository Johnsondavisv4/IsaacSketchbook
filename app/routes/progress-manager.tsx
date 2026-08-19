import { useState, useEffect } from 'react';
import type { Route } from './+types/progress-manager';
import fs from 'node:fs';
import { useFetcher } from 'react-router';
import { TopNav } from '../components/TopNav';
import { CharactersTab } from '../components/progress/CharactersTab';
import { ItemsTab } from '../components/progress/ItemsTab';
import { AchievementsTab } from '../components/progress/AchievementsTab';
import { SettingsModal } from '../components/progress/SettingsModal';

import {
  getSettings,
  saveSettings,
  resolveSaveFilePath,
  getSaveFilename,
  type SaveSettings,
} from '../services/save-parser/SettingsService';
import { parseSaveFile } from '../services/save-parser/SaveParser';
import { Character, type CharacterJSON } from '../services/save-parser/models/Character';
import type { ItemJSON } from '../services/save-parser/models/Item';
import type { AchievementJSON } from '../services/save-parser/models/Achievement';

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'Progress Manager - TBOI Modding Suite' },
    {
      name: 'description',
      content: 'Sincronización automática de guardado de Steam (.dat), marcas de completado y exportación para Photoshop',
    },
  ];
}

export async function loader() {
  const currentSettings = getSettings();
  if (!currentSettings) {
    return {
      configured: false,
      settings: {
        version: 'Repentance+' as const,
        slot: 1,
        characterMenu: 'normal' as const,
      },
      saveFile: '',
      saveExists: false,
      characters: [] as CharacterJSON[],
      achievements: [] as AchievementJSON[],
      items: [] as ItemJSON[],
    };
  }

  const status = resolveSaveFilePath(currentSettings);

  let parsed = null;
  if (status.exists && status.fullPath) {
    try {
      const buf = fs.readFileSync(status.fullPath);
      parsed = parseSaveFile(buf, currentSettings.version);
    } catch (e) {
      console.error('Error parseando save en loader:', e);
    }
  }

  let characters: CharacterJSON[] = [];
  if (parsed && parsed.characters) {
    characters = parsed.characters.map((c) => c.toJSON());
  } else {
    for (let id = 0; id <= 33; id++) {
      characters.push(new Character(id).toJSON());
    }
  }

  const achievements: AchievementJSON[] =
    parsed?.achievements ? parsed.achievements.map((a) => a.toJSON()) : [];
  const items: ItemJSON[] =
    parsed?.items ? parsed.items.map((i) => i.toJSON()) : [];

  return {
    configured: true,
    settings: currentSettings,
    saveFile: status.filename || getSaveFilename(currentSettings),
    saveExists: status.exists,
    characters,
    achievements,
    items,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const version = formData.get('version') as 'Repentance' | 'Repentance+';
  const slot = Number(formData.get('slot')) || 1;
  const characterMenu = (formData.get('characterMenu') as 'normal' | 'tainted') || 'normal';

  const saved = saveSettings({ version, slot, characterMenu });
  const status = resolveSaveFilePath(saved);

  return {
    ok: true,
    settings: saved,
    filename: status.filename,
    exists: status.exists,
    fullPath: status.fullPath,
  };
}

export default function ProgressManager({ loaderData }: Route.ComponentProps) {
  const {
    configured,
    settings: initialSettings,
    saveFile,
    saveExists,
    characters,
    achievements,
    items,
  } = loaderData;

  const fetcher = useFetcher();
  const [activeTab, setActiveTab] = useState<'characters' | 'items' | 'achievements'>('characters');
  const [characterFilter, setCharacterFilter] = useState<'normal' | 'tainted'>(
    initialSettings.characterMenu || 'normal'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!configured) {
      setIsSettingsOpen(true);
    }
  }, [configured]);

  const isConfigured = Boolean(fetcher.data?.configured ?? configured);
  const currentSettings = (fetcher.data?.settings as SaveSettings) || initialSettings;
  const currentSaveExists =
    fetcher.data?.exists !== undefined ? fetcher.data.exists : saveExists;
  const currentSaveFilename =
    fetcher.data?.filename !== undefined ? fetcher.data.filename : saveFile;

  const handleFilterChange = (newFilter: 'normal' | 'tainted') => {
    setCharacterFilter(newFilter);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterMenu: newFilter }),
    }).catch((err) => console.error('Error guardando filtro:', err));
  };

  const handleSaveSettings = (newSettings: SaveSettings) => {
    fetcher.submit(
      {
        version: newSettings.version,
        slot: String(newSettings.slot),
        characterMenu: characterFilter,
      },
      { method: 'post' }
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center p-3 md:p-5">
      <div className="w-full max-w-455 h-[calc(100vh-40px)] min-h-137.5 flex flex-col gap-3 overflow-hidden">
        <TopNav
          title={
            <span className="flex items-center gap-2.5">
              <i className="bi bi-graph-up-arrow text-red-500"></i>
              <span>Progress Manager</span>
            </span>
          }
          subtitle="Sincronización automática de Steam (.dat), marcas de completado y exportación dual de Post-its"
          rightContent={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 border ${isConfigured
                  ? 'text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border-neutral-700 hover:border-neutral-600 shadow-sm'
                  : 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/60'
                  }`}
                title="Configuración de guardado de Steam (Versión y Slot)"
              >
                <i className="bi bi-gear-fill text-xs text-neutral-400"></i>
                {isConfigured ? (
                  <div className="flex items-center gap-2">
                    <span>{currentSettings.version} · Slot {currentSettings.slot}</span>
                    <i
                      className={`bi ${
                        currentSaveExists
                          ? 'bi-check-circle-fill text-emerald-400'
                          : 'bi-exclamation-triangle-fill text-amber-400'
                      } text-xs`}
                    ></i>
                  </div>
                ) : (
                  <span>Configurar Partida</span>
                )}
              </button>

              <div
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-2 ${!isConfigured
                  ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  : currentSaveExists
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                    : 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                  }`}
              >
                <i
                  className={`bi ${
                    !isConfigured
                      ? 'bi-gear-wide-connected text-neutral-500'
                      : currentSaveExists
                        ? 'bi-steam text-emerald-400'
                        : 'bi-cloud-slash-fill text-amber-400'
                  } text-sm`}
                ></i>
                <span>
                  {!isConfigured
                    ? 'Configuración requerida'
                    : currentSaveExists
                      ? 'Sincronizado con Steam'
                      : 'Modo fuera de línea'}
                </span>
              </div>
            </div>
          }
        />

        <div className="shrink-0 flex items-center gap-2 bg-neutral-900 border border-neutral-700 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`flex-1 py-2 px-4 font-upheaval text-sm tracking-wide rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'characters'
              ? 'bg-red-700 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
          >
            <i className="bi bi-people-fill"></i>
            <span>Characters</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`flex-1 py-2 px-4 font-upheaval text-sm tracking-wide rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'items'
              ? 'bg-red-700 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
          >
            <i className="bi bi-box-seam-fill"></i>
            <span>Items</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 py-2 px-4 font-upheaval text-sm tracking-wide rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'achievements'
              ? 'bg-red-700 text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
          >
            <i className="bi bi-trophy-fill"></i>
            <span>Achievements</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === 'characters' && (
            <CharactersTab
              configured={isConfigured}
              characters={characters}
              filter={characterFilter}
              onFilterChange={handleFilterChange}
              version={currentSettings?.version}
            />
          )}

          {activeTab === 'items' && (
            <ItemsTab configured={isConfigured} items={items} />
          )}

          {activeTab === 'achievements' && (
            <AchievementsTab
              configured={isConfigured}
              achievements={achievements}
            />
          )}
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={currentSettings}
        saveExists={currentSaveExists}
        saveFilename={currentSaveFilename}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
