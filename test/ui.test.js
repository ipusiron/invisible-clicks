import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUI } from './support/dom.js';

test('初期状態は透明ボタンと模式図を無効にする', () => {
  const ui = loadUI();
  assert.equal(ui.get('invisible-overlay').hidden, true);
  assert.equal(ui.get('invisible-overlay').disabled, true);
  assert.equal(ui.get('frameWrap').hidden, true);
  assert.equal(ui.get('log').childElementCount, 0);
});

for (const eventType of ['pointerdown', 'mousedown']) {
  test(`${eventType}単独でも透明要素へのフォーカスを防ぎ、見えるボタンへ移す`, () => {
    const ui = loadUI();
    ui.click('tab-demo');
    ui.get('attackOverlay').focus();
    assert.equal(ui.document.activeElement.id, 'attackOverlay');
    let prevented = false;
    ui.get('invisible-overlay').dispatch(eventType, {
      preventDefault() { prevented = true; },
    });
    assert.equal(prevented, true);
    assert.equal(ui.document.activeElement, ui.get('fake-like'));
    assert.notEqual(ui.document.activeElement, ui.get('invisible-overlay'));
    assert.equal(ui.timers.size, 0, '押下だけでは模擬結果を予約しない');
  });
}

test('タブ移動はARIA、tabindex、hidden、activeを同時更新する', () => {
  const ui = loadUI();
  for (const selected of ui.tabs) {
    ui.click(selected.id);
    for (const tab of ui.tabs) {
      const active = tab === selected;
      assert.equal(tab.getAttribute('aria-selected'), String(active));
      assert.equal(tab.tabIndex, active ? 0 : -1);
      assert.equal(tab.classList.contains('active'), active);
      const panel = ui.get(tab.dataset.tab);
      assert.equal(panel.hidden, !active);
      assert.equal(panel.classList.contains('active'), active);
    }
  }
});

for (const [start, key, expected] of [
  ['learn', 'ArrowLeft', 'defense'], ['defense', 'ArrowRight', 'learn'],
  ['learn', 'ArrowRight', 'demo'], ['theory', 'ArrowLeft', 'demo'],
  ['demo', 'Home', 'learn'], ['demo', 'End', 'defense'],
]) {
  test(`キーボードの${key}で${start}から${expected}へ選択とフォーカスを移す`, () => {
    const ui = loadUI();
    ui.click('tab-' + start);
    let prevented = false;
    ui.get('tab-' + start).dispatch('keydown', { key, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(ui.document.activeElement.id, 'tab-' + expected);
    assert.equal(ui.get(expected).hidden, false);
  });
}

test('モード変更と復帰で透明要素、模式図、偽UIを同期する', () => {
  const ui = loadUI();
  ui.click('tab-demo');
  assert.equal(ui.get('invisible-overlay').disabled, false);
  ui.mode('attackFrame');
  assert.equal(ui.get('invisible-overlay').hidden, true);
  assert.equal(ui.get('frameWrap').hidden, false);
  ui.mode('attackOff');
  assert.equal(ui.get('attackerCard').hidden, true);
  assert.equal(ui.get('frameWrap').hidden, true);
  ui.click('tab-theory');
  ui.click('tab-demo');
  assert.equal(ui.get('attackerCard').hidden, true);
  assert.equal(ui.get('invisible-overlay').disabled, true);
  ui.mode('attackOverlay');
  assert.equal(ui.get('attackerCard').hidden, false);
  assert.equal(ui.get('invisible-overlay').disabled, false);
});

for (const mode of ['attackOverlay', 'attackFrame']) {
  for (const cancel of ['mode', 'tab', 'clear', 'pagehide']) {
    test(`${mode}: DOMの${cancel}イベントで保留処理を取り消す`, () => {
      const ui = loadUI();
      ui.click('tab-demo');
      ui.mode(mode);
      ui.click(mode === 'attackOverlay' ? 'invisible-overlay' : 'fake-like');
      assert.equal(ui.timers.size, 1);
      if (cancel === 'mode') ui.mode('attackOff');
      if (cancel === 'tab') ui.click('tab-learn');
      if (cancel === 'clear') ui.click('clear-log');
      if (cancel === 'pagehide') ui.window.dispatch('pagehide');
      assert.equal(ui.timers.size, 0);
      ui.flush();
      assert.doesNotMatch(ui.get('log').textContent, /削除の模擬結果/);
      if (cancel === 'clear') {
        assert.equal(ui.get('log').childElementCount, 0);
        assert.match(ui.get('log-status').textContent, /消去/);
      }
    });
  }
  test(`${mode}: キーボードclickは通常いいね、ポインターclickとは区別する`, () => {
    const ui = loadUI();
    ui.click('tab-demo');
    ui.mode(mode);
    ui.click('fake-like', 0);
    assert.match(ui.get('log').textContent, /通常の『いいね！』操作/);
    assert.equal(ui.timers.size, 0);
    ui.click(mode === 'attackOverlay' ? 'invisible-overlay' : 'fake-like', 1);
    assert.equal(ui.timers.size, 1);
    ui.flush();
    assert.match(ui.get('log').textContent, /削除の模擬結果/);
  });
  test(`${mode}: detailが0のタッチclickでも模擬操作を実行する`, () => {
    const ui = loadUI();
    ui.click('tab-demo');
    ui.mode(mode);
    ui.get(mode === 'attackOverlay' ? 'invisible-overlay' : 'fake-like')
      .dispatch('click', { detail: 0, pointerType: 'touch' });
    assert.equal(ui.timers.size, 1);
    ui.flush();
    assert.match(ui.get('log').textContent, /削除の模擬結果/);
  });
}

test('ログは時系列で末尾追加し、最新100件を保つ', () => {
  const ui = loadUI();
  ui.click('tab-demo');
  ui.click('clear-log');
  ui.click('fake-like', 0);
  ui.click('danger');
  assert.match(ui.get('log').children[0].textContent, /通常の/);
  assert.match(ui.get('log').children[1].textContent, /削除の模擬結果/);
  for (let i = 0; i < 101; i++) ui.click('danger');
  assert.equal(ui.get('log').childElementCount, 100);
  assert.doesNotMatch(ui.get('log').textContent, /通常の/);
  assert.equal(ui.get('log-status').textContent, '');
});

test('模式図のボタンの子要素からのクリックも同じ処理になる', () => {
  const ui = loadUI();
  ui.click('tab-demo');
  ui.mode('attackFrame');
  const button = new ui.Element();
  button.dataset.frame = 'danger';
  const child = new ui.Element();
  button.append(child);
  ui.get('frameWrap').dispatch('click', { target: child });
  assert.match(ui.get('log').textContent, /削除の模擬結果：iframe埋め込みの模式デモ/);
});
