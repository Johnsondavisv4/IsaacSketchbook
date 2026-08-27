import { useState, useEffect } from 'react';
import type { Route } from './+types/progress-manager';
import { readFile } from '@tauri-apps/plugin-fs';
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
  getAvailableVersions,
  type SaveSettings,
  type AvailableVersionsStatus,
} from '../services/save-parser/SettingsService';
import { parseSaveFile, getDefaultSaveData } from '../services/save-parser/SaveParser';
import {
  readAndEvaluateSaves,
  type SaveDrawingResult,
} from '../services/save-parser/SaveDrawingParser';
import type { CharacterJSON } from '../services/save-parser/models/Character';
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

export async function clientLoader() {
  const availableVersions = await getAvailableVersions();
  const currentSettings = await getSettings();
  if (!currentSettings) {
    const defaultVersion = (!availableVersions.hasRepentancePlus && availableVersions.hasRepentance)
      ? 'Repentance'
      : 'Repentance+';
    const saveDrawings = await readAndEvaluateSaves(defaultVersion);
    const defaultData = getDefaultSaveData(defaultVersion);
    return {
      configured: false,
      settings: null as SaveSettings | null,
      saveFile: '',
      saveExists: false,
      saveDrawings,
      availableVersions,
      characters: defaultData.characters.map((c) => c.toJSON()),
      achievements: defaultData.achievements.map((a) => a.toJSON()),
      items: defaultData.items.map((i) => i.toJSON()),
    };
  }

  const effectiveVersion = (!availableVersions.hasRepentancePlus && availableVersions.hasRepentance && currentSettings.version === 'Repentance+')
    ? 'Repentance'
    : currentSettings.version;
  const effectiveSettings = { ...currentSettings, version: effectiveVersion };

  const status = await resolveSaveFilePath(effectiveSettings);
  const saveDrawings = await readAndEvaluateSaves(effectiveSettings.version);

  let parsed = null;
  if (status.exists && status.fullPath) {
    try {
      const buf = await readFile(status.fullPath);
      parsed = parseSaveFile(buf, effectiveSettings.version);
    } catch (e) {
      console.error('Error parseando save en clientLoader:', e);
    }
  }

  const fallbackData = parsed ?? getDefaultSaveData(effectiveSettings.version);
  const characters: CharacterJSON[] = fallbackData.characters.map((c) => c.toJSON());
  const achievements: AchievementJSON[] = fallbackData.achievements.map((a) => a.toJSON());
  const items: ItemJSON[] = fallbackData.items.map((i) => i.toJSON());

  return {
    configured: true,
    settings: effectiveSettings,
    saveFile: status.filename || getSaveFilename(effectiveSettings),
    saveExists: status.exists,
    saveDrawings,
    availableVersions,
    characters,
    achievements,
    items,
  };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const version = formData.get('version') as 'Repentance' | 'Repentance+';
  const file = Number(formData.get('file') ?? formData.get('slot')) || 1;
  const characterMenu = (formData.get('characterMenu') as 'normal' | 'tainted') || 'normal';

  const saved = await saveSettings({ version, file, characterMenu });
  const status = await resolveSaveFilePath(saved);
  const saveDrawings = await readAndEvaluateSaves(saved.version);
  const availableVersions = await getAvailableVersions();

  return {
    ok: true,
    settings: saved,
    filename: status.filename,
    exists: status.exists,
    fullPath: status.fullPath,
    saveDrawings,
    availableVersions,
  };
}

export default function ProgressManager({ loaderData }: Route.ComponentProps) {
  const {
    configured,
    settings: initialSettings,
    saveFile,
    saveExists,
    saveDrawings: initialSaveDrawings,
    availableVersions: initialAvailableVersions,
    characters,
    achievements,
    items,
  } = loaderData;

  const fetcher = useFetcher();
  const [activeTab, setActiveTab] = useState<'characters' | 'items' | 'achievements'>('characters');
  const [characterFilter, setCharacterFilter] = useState<'normal' | 'tainted'>(
    initialSettings?.characterMenu || 'normal'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!configured) {
      setIsSettingsOpen(true);
    }
  }, [configured]);

  const isConfigured = Boolean(fetcher.data?.configured ?? configured);
  const currentSettings = ((fetcher.data?.settings as SaveSettings) || initialSettings) as SaveSettings | null;
  const currentSaveExists =
    fetcher.data?.exists !== undefined ? fetcher.data.exists : saveExists;
  const currentSaveFilename =
    fetcher.data?.filename !== undefined ? fetcher.data.filename : saveFile;
  const currentSaveDrawings =
    (fetcher.data?.saveDrawings as SaveDrawingResult[]) || initialSaveDrawings || [];
  const currentAvailableVersions =
    (fetcher.data?.availableVersions as AvailableVersionsStatus) || initialAvailableVersions;

  const handleFilterChange = (newFilter: 'normal' | 'tainted') => {
    setCharacterFilter(newFilter);
    saveSettings({ characterMenu: newFilter }).catch((err) => console.error('Error guardando filtro:', err));
  };

  const handleSaveSettings = (newSettings: SaveSettings) => {
    fetcher.submit(
      {
        version: newSettings.version,
        file: String(newSettings.file),
        characterMenu: characterFilter,
      },
      { method: 'post' }
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col p-3 md:p-5">
      <div className="w-full flex-1 flex flex-col gap-3 min-h-0">
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
                title="Configuración de guardado de Steam (Versión y Archivo)"
              >
                <i className="bi bi-gear-fill text-xs text-neutral-400"></i>
                {isConfigured && currentSettings ? (
                  <div className="flex items-center gap-2">
                    <span>{currentSettings.version} · File {currentSettings.file}</span>
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
                      : !currentAvailableVersions?.isGameInstalled
                        ? 'Juego no detectado (Offline)'
                        : 'Sin partida guardada (Offline)'}
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

        <div className="flex-1 min-h-0 flex flex-col">
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
        saveDrawings={currentSaveDrawings}
        availableVersions={currentAvailableVersions}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
