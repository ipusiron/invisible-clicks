import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const root = css.match(/:root\s*\{([^}]+)\}/)?.[1];
assert.ok(root, 'The palette must remain declared in :root.');
const colors = Object.fromEntries([...root.matchAll(/--([\w-]+)\s*:\s*(#[\da-f]{3,8})\s*;/gi)]
  .map(([, name, value]) => [name, value]));

function luminance(hex) {
  assert.match(hex, /^#(?:[\da-f]{3}|[\da-f]{6})$/i, `not an opaque RGB color: ${hex}`);
  const value = hex.length === 4 ? hex.slice(1).split('').map(char => char + char).join('') : hex.slice(1);
  const [red, green, blue] = [0, 2, 4].map(index => {
    const channel = Number.parseInt(value.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('コントラスト計算の基準値は黒白21:1、同色1:1', () => {
  assert.equal(contrast('#000', '#fff'), 21);
  assert.equal(contrast('#fff', '#fff'), 1);
});

const pairs = [];
for (const foreground of ['text', 'muted', 'accent']) {
  for (const background of ['bg', 'card', 'hover', 'warning-bg', 'subtle']) pairs.push([foreground, background]);
}
for (const background of ['accent', 'accent-hover', 'danger', 'danger-hover', 'table-heading']) {
  pairs.push(['on-accent', background]);
}
pairs.push(['code-text', 'code-bg'], ['inline-code', 'subtle']);

for (const [foreground, background] of pairs) {
  test(`文字色 --${foreground} / 背景 --${background} は4.5:1以上`, () => {
    assert.ok(colors[foreground], `missing --${foreground}`);
    assert.ok(colors[background], `missing --${background}`);
    const ratio = contrast(colors[foreground], colors[background]);
    assert.ok(ratio >= 4.5, `${foreground}/${background}: ${ratio.toFixed(3)}:1`);
  });
}

test('ライト配色の変数が実際の主要要素に使われる', () => {
  for (const name of Object.keys(colors)) {
    if (['border', 'focus', 'warning-border'].includes(name)) continue;
    assert.ok(css.includes(`var(--${name})`), `unused palette variable: --${name}`);
  }
  assert.doesNotMatch(css, /prefers-color-scheme\s*:\s*dark/);
  assert.match(css, /\.note\s*\{[^}]*color:var\(--muted\)/);
  assert.match(css, /pre\s*\{[^}]*background:var\(--code-bg\);\s*color:var\(--code-text\)/);
  assert.match(css, /\.checklist-table th\s*\{[^}]*background:var\(--table-heading\)/);
});
