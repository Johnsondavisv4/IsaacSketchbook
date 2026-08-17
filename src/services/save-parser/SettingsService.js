import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// settings.json se guarda en la raíz de IsaacSketchbook/
const SETTINGS_PATH = path.resolve(__dirname, '../../../settings.json');

const STEAM_USERDATA_ROOTS = [
    'C:\\Program Files (x86)\\Steam\\userdata',
    'C:\\Program Files\\Steam\\userdata',
    'D:\\Steam\\userdata',
    'E:\\Steam\\userdata'
];

/**
 * @typedef {Object} SaveSettings
 * @property {('Repentance'|'Repentance+')} version
 * @property {(1|2|3)} slot
 * @property {('normal'|'tainted')} [characterMenu]
 */

/**
 * Calcula el nombre exacto del archivo de guardado.
 * @param {SaveSettings} settings 
 * @returns {string}
 */
export function getSaveFilename(settings) {
    const prefix = settings.version === 'Repentance+' ? 'rep+' : 'rep_';
    const slot = settings.slot || 1;
    return `${prefix}persistentgamedata${slot}.dat`;
}

/**
 * Lee la configuración actual desde settings.json.
 * @returns {SaveSettings|null}
 */
export function getSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && parsed.version && parsed.slot) {
                return {
                    version: parsed.version === 'Repentance+' ? 'Repentance+' : 'Repentance',
                    slot: Number(parsed.slot) || 1,
                    characterMenu: parsed.characterMenu === 'tainted' ? 'tainted' : 'normal'
                };
            }
        }
    } catch (err) {
        console.error('Error leyendo settings.json:', err.message);
    }
    return null;
}

/**
 * Guarda la configuración en settings.json.
 * @param {Partial<SaveSettings>} newSettings 
 * @returns {SaveSettings}
 */
export function saveSettings(newSettings) {
    const current = getSettings() || {};
    const validated = {
        version: newSettings.version ? (newSettings.version === 'Repentance+' ? 'Repentance+' : 'Repentance') : (current.version || 'Repentance+'),
        slot: newSettings.slot !== undefined ? Math.min(3, Math.max(1, Number(newSettings.slot) || 1)) : (current.slot || 1),
        characterMenu: newSettings.characterMenu ? (newSettings.characterMenu === 'tainted' ? 'tainted' : 'normal') : (current.characterMenu || 'normal')
    };

    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(validated, null, 2), 'utf8');
    return validated;
}

/**
 * Busca la ruta completa del archivo de guardado en Steam según la configuración actual.
 * @param {SaveSettings} [settings] 
 * @returns {{ fullPath: string|null, filename: string, exists: boolean }}
 */
export function resolveSaveFilePath(settings) {
    const activeSettings = settings || getSettings();
    if (!activeSettings) {
        return { fullPath: null, filename: '', exists: false };
    }

    const filename = getSaveFilename(activeSettings);

    for (const root of STEAM_USERDATA_ROOTS) {
        if (!fs.existsSync(root)) continue;

        try {
            const userDirs = fs.readdirSync(root);
            for (const userDir of userDirs) {
                const remoteDir = path.join(root, userDir, '250900', 'remote');
                if (fs.existsSync(remoteDir)) {
                    const fullPath = path.join(remoteDir, filename);
                    if (fs.existsSync(fullPath)) {
                        return { fullPath, filename, exists: true };
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de acceso a carpetas
        }
    }

    return { fullPath: null, filename, exists: false };
}
