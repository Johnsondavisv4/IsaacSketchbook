import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCharacterUnlock, isCharacterVisible } from '../app/lib/character-unlocks.ts';

const achievement = (id, unlocked) => ({ id, unlocked });

test('Isaac is available without an achievement or save', () => {
  assert.equal(getCharacterUnlock(0, [], false).state, 'unlocked');
});

test('a character follows its achievement flag, including a changed save', () => {
  assert.equal(getCharacterUnlock(1, [achievement(1, false)], true).state, 'locked');
  assert.equal(getCharacterUnlock(1, [achievement(1, true)], true).state, 'unlocked');
});

test('Blue Baby uses ??? rather than the identically named co-op baby', () => {
  assert.equal(getCharacterUnlock(4, [achievement(32, false), achievement(209, true)], true).state, 'locked');
  assert.equal(getCharacterUnlock(4, [achievement(32, true), achievement(209, false)], true).state, 'unlocked');
});

test('Keeper equipment achievements do not unlock Keeper', () => {
  assert.equal(getCharacterUnlock(12, [achievement(237, true), achievement(251, false)], true).state, 'locked');
});

test('offline and absent achievement data remain unknown', () => {
  assert.equal(getCharacterUnlock(1, [achievement(1, false)], false).state, 'unknown');
  assert.equal(getCharacterUnlock(1, [], true).state, 'unknown');
  assert.equal(getCharacterUnlock(17, [achievement(1, true)], true).state, 'unknown');
});

test('Tainted unlocks use the 474–490 range in character ID order', () => {
  assert.equal(getCharacterUnlock(17, [achievement(474, true)], true).state, 'unlocked');
  assert.equal(getCharacterUnlock(21, [achievement(478, false), achievement(479, true)], true).state, 'locked');
  assert.equal(getCharacterUnlock(22, [achievement(478, false), achievement(479, true)], true).state, 'unlocked');
  assert.equal(getCharacterUnlock(33, [achievement(490, true)], true).state, 'unlocked');
});

test('secret normals and their locked Tainted versions stay absent until the normal unlocks', () => {
  for (const [normal, flag, taintedFlag] of [[4, 32, 478], [10, 82, 484], [12, 251, 486], [14, 390, 488]]) {
    const locked = [achievement(flag, false), achievement(taintedFlag, false)];
    assert.equal(isCharacterVisible(normal, locked, true), false);
    assert.equal(isCharacterVisible(normal + 17, locked, true), false);
    const normalUnlocked = [achievement(flag, true), achievement(taintedFlag, false)];
    assert.equal(isCharacterVisible(normal, normalUnlocked, true), true);
    assert.equal(isCharacterVisible(normal + 17, normalUnlocked, true), true);
    assert.equal(getCharacterUnlock(normal + 17, normalUnlocked, true).state, 'locked');
  }
});

test('ordinary locked characters stay visible, and unknown data does not hide characters', () => {
  assert.equal(isCharacterVisible(1, [achievement(1, false)], true), true);
  assert.equal(isCharacterVisible(18, [achievement(1, false), achievement(475, false)], true), true);
  assert.equal(isCharacterVisible(4, [], false), true);
  assert.equal(isCharacterVisible(21, [], false), true);
  assert.equal(isCharacterVisible(4, [], true), true);
});

test('an explicitly unlocked secret Tainted remains visible with inconsistent normal flags', () => {
  assert.equal(isCharacterVisible(21, [achievement(32, false), achievement(478, true)], true), true);
});
