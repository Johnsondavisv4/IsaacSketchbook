import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

let settings = null;
let steam = { userdataPath: null, isGameInstalled: false };
let files = new Set();
mock.module('@tauri-apps/api/core', { namedExports: {
  invoke: async (command, args) => {
    if (command === 'get_settings') return settings;
    if (command === 'save_settings') { settings = structuredClone(args.settings); return settings; }
    if (command === 'get_steam_status') return steam;
    if (command === 'get_exe_dir') return 'X:/Sketchbook';
    throw new Error(command);
  },
} });
mock.module('@tauri-apps/plugin-fs', { namedExports: {
  exists: async path => files.has(path),
  readDir: async () => [{ name: 'account1', isDirectory: true }],
  readTextFile: async () => JSON.stringify(settings),
  writeTextFile: async (_, content) => { settings = JSON.parse(content); },
} });
const { getSettings, saveSettings, resolveSaveFilePath, getAvailableVersions } =
  await import('../app/services/save-parser/SettingsService.ts');

test('native settings preserve character view across slot and version changes', async t => {
  await t.test('new settings default to list', async () => {
    assert.equal(await getSettings(), null);
    assert.equal((await saveSettings({})).characterView, 'list');
  });
  await t.test('legacy settings default to list', async () => {
    settings = { version: 'Repentance', file: 3, characterMenu: 'tainted' };
    assert.deepEqual(await getSettings(), { ...settings, characterView: 'list' });
  });
  await t.test('wheel persists through partial updates', async () => {
    await saveSettings({ characterView: 'wheel' });
    await saveSettings({ file: 2 });
    await saveSettings({ version: 'Repentance+', characterMenu: 'normal' });
    assert.deepEqual(await getSettings(), { version: 'Repentance+', file: 2, characterMenu: 'normal', characterView: 'wheel' });
  });
  await t.test('invalid views normalize to list', async () => {
    await saveSettings({ characterView: 'invalid' });
    assert.equal((await getSettings()).characterView, 'list');
  });
});

test('native Steam discovery uses the detected path and respects offline states', async () => {
  const root = 'Z:\\CustomSteam\\userdata';
  const remote = root + '\\account1\\250900\\remote';
  const filename = 'rep+persistentgamedata2.dat';
  const fullPath = remote + '\\' + filename;
  const selected = { version: 'Repentance+', file: 2, characterMenu: 'normal' };
  steam = { userdataPath: root, isGameInstalled: true };
  files = new Set([root, remote, fullPath]);
  assert.deepEqual(await resolveSaveFilePath(selected), { fullPath, filename, exists: true });
  assert.deepEqual(await getAvailableVersions(), { hasRepentancePlus: true, hasRepentance: false, isSteamDetected: true, isGameInstalled: true });
  steam.isGameInstalled = false;
  assert.equal((await resolveSaveFilePath(selected)).exists, false);
  assert.equal((await getAvailableVersions()).isGameInstalled, false);
  steam.isGameInstalled = true;
  files.clear();
  assert.equal((await resolveSaveFilePath(selected)).exists, false);
  steam = { userdataPath: null, isGameInstalled: false };
  assert.equal((await getAvailableVersions()).isSteamDetected, false);
});
