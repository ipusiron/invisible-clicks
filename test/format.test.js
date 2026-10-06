import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function sources(directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? sources(relative) : /\.(?:js|ts|css)$/.test(entry.name) ? [relative] : [];
  });
}
const files = ['index.html', 'style.css', 'vite.config.ts', ...sources('src'), ...sources('test')];
const minimumLines = {
  'index.html': 300,
  'style.css': 200,
  'src/main.ts': 80,
  'src/demo-state.ts': 50,
  'vite.config.ts': 10,
};

test('書式検査はソースと自作テスト全体を対象にし、ビルド出力を除く', () => {
  assert.ok(files.length >= 12);
  assert.equal(new Set(files).size, files.length);
  assert.equal(files.some(file => file.startsWith('docs/')), false);
  for (const required of ['test/html.test.js', 'test/readme.test.js', 'test/contrast.test.js', 'test/format.test.js']) {
    assert.ok(files.includes(required), required);
  }
});

for (const file of files) {
  test(`${file}: 空ファイル化せず、HTML250字・その他160字以内に整形する`, () => {
    const text = readFileSync(path.join(root, file), 'utf8');
    const lines = text.split(/\r?\n/);
    const nonempty = lines.filter(line => line.trim()).length;
    assert.ok(nonempty >= (minimumLines[file] ?? 10), `${file}: only ${nonempty} nonempty lines`);
    const maximum = file.endsWith('.html') ? 250 : 160;
    const violations = lines.flatMap((line, index) => line.length > maximum ? [`${index + 1}:${line.length}`] : []);
    assert.deepEqual(violations, [], `${file}: overlong lines (line:length), maximum ${maximum}`);
    assert.ok(text.endsWith('\n'), `${file}: missing final newline`);
    assert.doesNotMatch(text, /^(?:<{7}|={7}|>{7})(?:\s|$)/m, `${file}: conflict marker`);
  });
}
