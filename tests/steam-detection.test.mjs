import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mock, test } from 'node:test';
import { findSteamAppSync } from 'steam-locate';

test('Steam discovery and save lookup', async t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'isaac-steam-'));
  const steam = path.join(temporary, 'Custom Steam');
  const library = path.join(temporary, 'Other Library');
  let detectedPath = steam;
  let discoveries = 0;

  mock.module('steam-locate', {
    namedExports: {
      findSteamPathSync() {
        discoveries++;
        if (!detectedPath) throw new Error('Steam not found');
        return detectedPath;
      },
      findSteamAppSync,
    },
  });
  // Isolate discovery from Steam and saves installed on the test machine.
  mock.module('node:fs', {
    defaultExport: {
      ...fs,
      existsSync(value) {
        return value.startsWith(temporary) && fs.existsSync(value);
      },
    },
  });
  const loadService = suffix => import(`../app/services/save-parser/SettingsService.ts?${suffix}`);
  const settings = { version: 'Repentance+', file: 2, characterMenu: 'normal' };
  const filename = 'rep+persistentgamedata2.dat';
  const remote = path.join(steam, 'userdata', '123', '250900', 'remote');
  fs.mkdirSync(remote, { recursive: true });
  fs.writeFileSync(path.join(remote, filename), 'fixture');

  try {
    await t.test('custom Steam path and saves without an installed game', async () => {
      const service = await loadService('custom');
      const status = service.getAvailableVersions();
      assert.equal(status.isSteamDetected, true);
      assert.equal(status.hasRepentancePlus, true);
      assert.equal(status.isGameInstalled, false);
      assert.equal(service.resolveSaveFilePath(settings).exists, false);
      assert.equal(service.resolveSaveFilePath(settings).fullPath, null);
      assert.equal(discoveries, 1, 'reuse discovery for repeated save queries');
      fs.unlinkSync(path.join(remote, filename));
      assert.equal(service.resolveSaveFilePath(settings).exists, false, 'do not cache saves');
    });

    await t.test('game installed in a secondary library without saves', async () => {
      fs.mkdirSync(path.join(steam, 'steamapps'), { recursive: true });
      fs.mkdirSync(path.join(library, 'steamapps', 'common', 'Isaac'), { recursive: true });
      fs.writeFileSync(path.join(steam, 'steamapps', 'libraryfolders.vdf'),
        `"libraryfolders" { "1" { "path" ${JSON.stringify(library)} } }`);
      fs.writeFileSync(path.join(library, 'steamapps', 'appmanifest_250900.acf'),
        '"AppState" { "appid" "250900" "installdir" "Isaac" }');
      const service = await loadService('library');
      assert.equal(service.getAvailableVersions().isGameInstalled, true);
      assert.equal(service.getAvailableVersions().hasRepentancePlus, false);
      assert.equal(service.resolveSaveFilePath(settings).exists, false);
      fs.writeFileSync(path.join(remote, filename), 'fixture');
      assert.equal(service.resolveSaveFilePath(settings).fullPath, path.join(remote, filename));
      fs.unlinkSync(path.join(remote, filename));
      assert.equal(service.resolveSaveFilePath(settings).exists, false);
    });

    await t.test('missing Steam returns an offline status', async () => {
      detectedPath = null;
      const service = await loadService('missing');
      assert.deepEqual(service.getAvailableVersions(), {
        hasRepentancePlus: false, hasRepentance: false,
        isSteamDetected: false, isGameInstalled: false,
      });
      assert.equal(service.resolveSaveFilePath(settings).exists, false);
    });
  } finally {
    mock.restoreAll();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
