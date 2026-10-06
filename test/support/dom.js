import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { activationFor, createDemoState, MAX_LOG_ENTRIES } from '../../src/demo-state.ts';

// 状態更新の全イベント経路を実行する小さなDOM代替。レイアウトは実ブラウザーで検証する。
class Element {
  constructor(id = '') {
    this.id = id;
    this.dataset = {};
    this.attributes = {};
    this.listeners = new Map();
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.tabIndex = -1;
    this.value = '';
    const classes = new Set();
    this.classList = {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains: name => classes.has(name),
    };
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  dispatch(type, properties = {}) {
    const event = { target: this, detail: 1, preventDefault() {}, ...properties };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  focus() { this.document.activeElement = this; }
  append(child) {
    child.parent = this;
    this.children.push(child);
  }
  remove() {
    this.parent.children = this.parent.children.filter(child => child !== this);
  }
  replaceChildren() { this.children = []; this.value = ''; }
  closest(selector) {
    if (selector === '[data-frame="danger"]' && this.dataset.frame === 'danger') return this;
    return this.parent?.closest(selector) ?? null;
  }
  get childElementCount() { return this.children.length; }
  get firstElementChild() { return this.children[0] ?? null; }
  get scrollHeight() { return this.children.length; }
  get textContent() { return this.value + this.children.map(child => child.textContent).join('\n'); }
  set textContent(value) { this.value = String(value); this.children = []; }
}

export function loadUI() {
  const elements = new Map();
  const ids = [
    'fake-like', 'invisible-overlay', 'attackOverlay', 'attackFrame', 'attackOff', 'danger', 'log',
    'log-status', 'clear-log', 'frameWrap', 'attackerCard', 'learn', 'demo', 'theory', 'defense',
  ];
  for (const id of ids) elements.set(id, new Element(id));
  const tabs = ['learn', 'demo', 'theory', 'defense'].map(name => {
    const tab = new Element('tab-' + name);
    tab.dataset.tab = name;
    elements.set(tab.id, tab);
    return tab;
  });
  const panels = tabs.map(tab => elements.get(tab.dataset.tab));
  const document = {
    activeElement: null,
    getElementById: id => elements.get(id) ?? null,
    createElement: () => new Element(),
    querySelectorAll: selector => selector === '.tab-button' ? tabs : panels,
  };
  for (const element of elements.values()) element.document = document;
  const timers = new Map();
  let nextId = 0;
  const window = new Element();
  window.setTimeout = callback => { timers.set(++nextId, callback); return nextId; };
  window.clearTimeout = id => timers.delete(id);
  const main = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
  const source = stripTypeScriptTypes(main).replace(/^import[^\n]+\n/, '');
  vm.runInNewContext(source, { activationFor, createDemoState, MAX_LOG_ENTRIES, document, window, Element, Date });
  const get = id => elements.get(id);
  const click = (id, detail = 1) => get(id).dispatch('click', { detail });
  const mode = id => {
    for (const name of ['attackOverlay', 'attackFrame', 'attackOff']) get(name).checked = name === id;
    get(id).dispatch('change');
  };
  const flush = () => {
    for (const [id, callback] of [...timers]) {
      timers.delete(id);
      callback();
    }
  };
  return { get, click, mode, flush, tabs, panels, timers, document, window, Element };
}
