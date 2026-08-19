import { useState, useEffect } from 'react';
import type { Route } from './+types/progress-manager-beta';
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
    { title: 'Progress Manager (Beta) - TBOI Modding Suite' },
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

export default function ProgressManagerBeta({ loaderData }: Route.ComponentProps) {
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

  const saveSettingsLabel = isConfigured
    ? `${currentSettings.version === 'Repentance+' ? '🟢' : '🔴'} ${currentSettings.version} · Slot ${currentSettings.slot} ${currentSaveExists ? '✔️' : '⚠️'}`
    : '⚙️ Configurar Partida';

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
          title="📈 Progress Manager"
          subtitle="Sincronización automática de Steam (.dat), marcas de completado y exportación dual de Post-its"
          rightContent={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border ${isConfigured
                  ? 'text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border-neutral-700 hover:border-neutral-600 shadow-sm'
                  : 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/60'
                  }`}
                title="Configuración de guardado de Steam (Versión y Slot)"
              >
                <span>⚙️</span>
                <span>{saveSettingsLabel}</span>
              </button>

              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${!isConfigured
                  ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  : currentSaveExists
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                    : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${!isConfigured
                    ? 'bg-neutral-600'
                    : currentSaveExists
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                    }`}
                />
                <span>
                  {!isConfigured
                    ? 'Configuración requerida'
                    : currentSaveExists
                      ? 'Sincronizado con Steam'
                      : 'Modo fuera de línea'}
                </span>
              </span>
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
            <span>🧙‍♂️</span>
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
            <span>📦</span>
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
            <span>🏆</span>
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
