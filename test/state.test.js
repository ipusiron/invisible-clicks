import test from 'node:test';
import assert from 'node:assert/strict';
import { activationFor, createDemoState, DELAY_MS, MAX_LOG_ENTRIES, MAX_PENDING } from '../src/demo-state.ts';

function fixture() {
  const events = [];
  const timers = new Map();
  const archived = [];
  let nextId = 0;
  const state = createDemoState({
    emit: event => events.push(event),
    schedule: (callback, delay) => {
      assert.equal(delay, 300);
      timers.set(++nextId, callback);
      archived.push(callback);
      return nextId;
    },
    cancel: handle => timers.delete(handle),
  });
  const flush = () => {
    for (const [handle, callback] of [...timers]) {
      timers.delete(handle);
      callback();
    }
  };
  return { state, events, timers, archived, flush };
}

test('detailが0のtouchとpenをキーボードと混同しない', () => {
  assert.equal(activationFor(0), 'keyboard');
  assert.equal(activationFor(0, ''), 'keyboard');
  for (const type of ['mouse', 'touch', 'pen']) assert.equal(activationFor(0, type), 'pointer');
  assert.equal(activationFor(1), 'pointer');
});

test('教育用の遅延とログ件数の仕様', () => {
  assert.equal(DELAY_MS, 300);
  assert.equal(MAX_LOG_ENTRIES, 100);
  assert.equal(MAX_PENDING, 100);
});

test('初期タブでは模擬操作も予約も行わない', () => {
  const { state, events, timers } = fixture();
  assert.deepEqual(state.snapshot(), { mode: 'overlay', active: false, pendingCount: 0 });
  assert.equal(state.overlay('pointer'), false);
  assert.equal(state.like('pointer'), false);
  assert.equal(state.danger('direct'), false);
  assert.equal(events.length, 0);
  assert.equal(timers.size, 0);
});

for (const mode of ['overlay', 'frame']) {
  const click = state => mode === 'overlay' ? state.overlay('pointer') : state.like('pointer');
  test(`${mode}: 待機中は削除結果を出さず300ms後に1件出す`, () => {
    const { state, events, flush } = fixture();
    state.setMode(mode);
    state.setActive(true);
    assert.equal(click(state), true);
    assert.deepEqual(events.at(-1), { type: 'queued', source: mode });
    assert.equal(events.filter(event => event.type === 'danger').length, 0);
    flush();
    assert.deepEqual(events.at(-1), { type: 'danger', source: mode });
    assert.equal(state.snapshot().pendingCount, 0);
  });
  for (const action of ['off', 'mode', 'leave', 'clear']) {
    test(`${mode}: ${action}で予約を取り消し遅れて届くコールバックも破棄`, () => {
      const { state, events, timers, archived, flush } = fixture();
      state.setMode(mode);
      state.setActive(true);
      click(state);
      if (action === 'off') state.setMode('off');
      if (action === 'mode') state.setMode(mode === 'overlay' ? 'frame' : 'overlay');
      if (action === 'leave') state.setActive(false);
      if (action === 'clear') state.cancelPending();
      assert.equal(timers.size, 0);
      assert.equal(state.snapshot().pendingCount, 0);
      // 元の状態に戻っても、古い世代の結果を受け付けない。
      state.setMode(mode);
      state.setActive(true);
      flush();
      for (const callback of archived) callback();
      assert.equal(events.filter(event => event.type === 'danger').length, 0);
      click(state);
      flush();
      assert.equal(events.filter(event => event.type === 'danger').length, 1);
    });
  }
  test(`${mode}: キーボードは通常いいねでありポインターの誘導を模擬しない`, () => {
    const { state, events, timers } = fixture();
    state.setMode(mode);
    state.setActive(true);
    state.like('keyboard');
    assert.deepEqual(events.at(-1), { type: 'normal', activation: 'keyboard' });
    assert.equal(timers.size, 0);
    assert.equal(state.overlay('keyboard'), false);
  });
}

test('無効時は偽UI操作を無視し正規UIの操作だけ模擬する', () => {
  const { state, events } = fixture();
  state.setActive(true);
  state.setMode('off');
  assert.equal(state.like('pointer'), false);
  assert.equal(state.overlay('pointer'), false);
  assert.equal(state.danger('frame'), false);
  assert.equal(state.danger('direct'), true);
  assert.deepEqual(events.at(-1), { type: 'danger', source: 'direct' });
});

test('模式図のボタンはframeモードの表示中だけ処理する', () => {
  const { state, events } = fixture();
  state.setActive(true);
  assert.equal(state.danger('frame'), false);
  state.setMode('frame');
  assert.equal(state.danger('frame'), true);
  assert.deepEqual(events.at(-1), { type: 'danger', source: 'frame' });
  state.setActive(false);
  assert.equal(state.danger('frame'), false);
});

test('連打の予約も上限を持ち、消去後は再び予約できる', () => {
  const { state, timers, events, flush } = fixture();
  state.setActive(true);
  for (let i = 0; i < 100; i++) assert.equal(state.overlay('pointer'), true);
  assert.equal(state.overlay('pointer'), false);
  assert.equal(timers.size, 100);
  flush();
  assert.equal(events.filter(event => event.type === 'danger').length, 100);
  state.cancelPending();
  assert.equal(state.overlay('pointer'), true);
});

test('同じタブとモードの再指定では重複通知しない', () => {
  const { state, events } = fixture();
  state.setActive(true);
  state.setMode('overlay');
  state.setActive(true);
  assert.deepEqual(events, [{ type: 'mode', mode: 'overlay' }]);
});

test('不明なモードを拒否し状態を維持する', () => {
  const { state } = fixture();
  assert.throws(() => state.setMode('unknown'), TypeError);
  assert.equal(state.snapshot().mode, 'overlay');
});
