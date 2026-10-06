import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// This static tokenizer handles quoted attributes; it is not a replacement for browser parsing.
function openingTags(source) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
  return [...withoutComments.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].map(match => {
    const attributes = {};
    for (const attribute of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      const name = attribute[1].toLowerCase();
      assert.equal(Object.hasOwn(attributes, name), false, `duplicate attribute: ${name}`);
      attributes[name] = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
    }
    return { name: match[1].toLowerCase(), attributes };
  });
}

const tags = openingTags(html);
const byId = id => tags.find(tag => tag.attributes.id === id)?.attributes;

test('13個すべての教材pre/codeが空ではない文字列であり、HTML実要素を作らない', () => {
  const blocks = [...html.matchAll(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi)];
  assert.equal(blocks.length, 13);
  assert.equal(tags.filter(tag => tag.name === 'pre').length, 13);
  for (const [index, block] of blocks.entries()) {
    assert.ok(block[1].trim().length >= 30, `code example ${index + 1} is empty or truncated`);
    assert.doesNotMatch(block[1], /</, `code example ${index + 1} contains unescaped '<'`);
    assert.equal(openingTags(block[1]).length, 0);
  }
  assert.equal(blocks.filter(block => /&lt;iframe\b/.test(block[1])).length, 2);
  assert.match(blocks.map(block => block[1]).join('\n'), /https:\/\/example\.invalid\//);
});

test('実iframe、埋め込みオブジェクト、インラインコード、style、handlerがない', () => {
  assert.equal(tags.filter(tag => ['iframe', 'object', 'embed', 'style'].includes(tag.name)).length, 0);
  for (const tag of tags) {
    assert.equal(Object.hasOwn(tag.attributes, 'style'), false, `${tag.name}: inline style`);
    assert.deepEqual(Object.keys(tag.attributes).filter(name => /^on/i.test(name)), []);
  }
  const scripts = tags.filter(tag => tag.name === 'script');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].attributes.type, 'module');
  assert.equal(scripts[0].attributes.src, '/src/main.ts');
  assert.match(html, /<script\b[^>]+>\s*<\/script>/);
});

test('本番CSPは読込元を限定し、metaで無効なframe-ancestorsを防御として置かない', () => {
  const policies = tags.filter(tag => tag.name === 'meta'
    && tag.attributes['http-equiv']?.toLowerCase() === 'content-security-policy');
  assert.equal(policies.length, 1);
  const entries = policies[0].attributes.content.split(';').map(part => part.trim()).filter(Boolean);
  const directives = entries.map(entry => entry.split(/\s+/));
  assert.equal(new Set(directives.map(([name]) => name)).size, directives.length);
  assert.deepEqual(Object.fromEntries(directives.map(([name, ...values]) => [name, values])), {
    'default-src': ["'none'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'none'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
  });
  assert.doesNotMatch(policies[0].attributes.content, /unsafe-|frame-ancestors/i);
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('rel="stylesheet"'));
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'));
  assert.equal(tags.some(tag => /x-frame-options/i.test(tag.attributes['http-equiv'] ?? '')), false);
  const referrer = tags.filter(tag => tag.name === 'meta' && tag.attributes.name === 'referrer');
  assert.equal(referrer.length, 1);
  assert.equal(referrer[0].attributes.content, 'no-referrer');
  assert.ok(tags.some(tag => tag.name === 'link' && tag.attributes.rel === 'icon' && tag.attributes.href === 'data:,'));
  assert.match(html, /<noscript>[\s\S]*JavaScript[\s\S]*HTTP[\s\S]*<\/noscript>/);
});

test('4タブと4パネルの対応、一意ID、初期ARIAとhiddenが一致する', () => {
  const ids = tags.map(tag => tag.attributes.id).filter(Boolean);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(tags.filter(tag => tag.attributes.role === 'tablist').length, 1);
  const tabs = tags.filter(tag => tag.attributes.role === 'tab');
  const panels = tags.filter(tag => tag.attributes.role === 'tabpanel');
  assert.equal(tabs.length, 4);
  assert.equal(panels.length, 4);
  assert.deepEqual(tabs.map(tag => tag.attributes['data-tab']), ['learn', 'demo', 'theory', 'defense']);
  for (const { attributes: tab } of tabs) {
    const name = tab['data-tab'];
    const active = name === 'learn';
    assert.equal(tab.id, `tab-${name}`);
    assert.equal(tab['aria-controls'], name);
    assert.equal(tab['aria-selected'], String(active));
    assert.equal(tab.tabindex, active ? '0' : '-1');
    assert.equal(tab.class.split(/\s+/).includes('active'), active);
    const panel = byId(name);
    assert.equal(panel.role, 'tabpanel');
    assert.equal(panel['aria-labelledby'], tab.id);
    assert.equal(panel.tabindex, '0');
    assert.equal(Object.hasOwn(panel, 'hidden'), !active);
    assert.equal(panel.class.split(/\s+/).includes('active'), active);
  }
});

test('透明な補助ボタンとログのアクセシビリティ契約を保持する', () => {
  const overlay = byId('invisible-overlay');
  assert.equal(overlay.tabindex, '-1');
  assert.equal(overlay['aria-hidden'], 'true');
  assert.ok(Object.hasOwn(overlay, 'disabled'));
  assert.ok(Object.hasOwn(overlay, 'hidden'));
  assert.match(html, /<div class="click-target">\s*<button[^>]+id="fake-like"[\s\S]*?id="invisible-overlay"/);
  assert.equal(byId('log').role, 'log');
  assert.equal(byId('log')['aria-live'], 'polite');
  assert.equal(byId('log')['aria-relevant'], 'additions');
  assert.ok(byId('clear-log'));
  assert.equal(byId('log-status').role, 'status');
  assert.equal(byId('log-status')['aria-live'], 'polite');
});

test('外部リンクを別タブで開くときnoopenerとnoreferrerを付ける', () => {
  const links = tags.filter(tag => tag.name === 'a' && tag.attributes.target === '_blank');
  assert.ok(links.length >= 5);
  for (const { attributes: link } of links) {
    assert.match(link.href, /^https:\/\//);
    const rel = new Set((link.rel ?? '').split(/\s+/));
    assert.ok(rel.has('noopener'), link.href);
    assert.ok(rel.has('noreferrer'), link.href);
  }
});
