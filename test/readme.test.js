import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DELAY_MS, MAX_LOG_ENTRIES } from '../src/demo-state.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const readme = read('README.md');
const documentNames = ['README.md', 'CLICKJACKING-GUIDE.md', 'DEVELOPMENT.md', 'CLAUDE.md'];
const documents = Object.fromEntries(documentNames.map(name => [name, read(name)]));
const metadata = readme.match(/^<!--\r?\n---\r?\n([\s\S]*?)\r?\n---\r?\n-->/)?.[1];
assert.ok(metadata, 'README metadata must remain inside the opening HTML comment.');

function fields(source) {
  const result = {};
  let current;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const field = line.match(/^([a-z_]+):\s*(.*)$/);
    if (field) {
      assert.equal(Object.hasOwn(result, field[1]), false, `duplicate metadata key: ${field[1]}`);
      current = field[1];
      result[current] = field[2] ? field[2].replace(/^"|"$/g, '') : [];
      continue;
    }
    const item = line.match(/^  - (.+)$/);
    assert.ok(item && Array.isArray(result[current]), `unsupported metadata syntax: ${line}`);
    result[current].push(item[1]);
  }
  return result;
}

test('READMEの固定メタデータキー、Day ID、URL、ブロック配列を保持する', () => {
  const data = fields(metadata);
  const expected = [
    'id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en',
    'category_ja', 'category_en', 'difficulty', 'tags', 'repo_url', 'demo_url', 'hub',
  ];
  assert.deepEqual(Object.keys(data), expected);
  assert.equal(data.id, 'day058');
  assert.equal(data.slug, 'invisible-clicks');
  assert.equal(data.title, 'Invisible Clicks');
  assert.equal(data.repo_url, 'https://github.com/ipusiron/invisible-clicks');
  assert.equal(data.demo_url, 'https://ipusiron.github.io/invisible-clicks/');
  assert.equal(data.difficulty, '3');
  assert.equal(data.hub, 'true');
  assert.deepEqual(data.category_ja, ['Webセキュリティ']);
  assert.deepEqual(data.category_en, ['Web Security']);
  assert.deepEqual(data.tags, ['clickjacking', 'web-security', 'education', 'typescript', 'vite']);
  for (const key of ['subtitle_ja', 'subtitle_en', 'description_ja', 'description_en']) {
    assert.ok(typeof data[key] === 'string' && data[key].length >= 10, `${key}: missing description`);
  }
  assert.doesNotMatch(metadata, /^(?:tags|category_ja|category_en):\s*\[/m);
});

test('READMEのスクリーンショットを引用内に保持し、相対リンク先を実在確認する', () => {
  assert.match(readme, /^>\s*!\[[^\]]+\]\(assets\/screenshot\.png\)/m);
  const links = [...readme.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)];
  const local = links.map(match => match[1]).filter(target => !/^(?:[a-z]+:|\/\/|#)/i.test(target));
  assert.ok(local.length >= 4, 'relative documentation links must not disappear');
  for (const target of local) {
    const file = decodeURIComponent(target.split('#')[0].split('?')[0]);
    const absolute = path.resolve(root, file);
    assert.equal(path.relative(root, absolute).startsWith('..'), false, `outside repository: ${target}`);
    assert.ok(existsSync(absolute), `missing relative link: ${target}`);
  }
});

test('READMEの300msと最新100件が実装定数に一致し、模擬動作の限界を明記する', () => {
  assert.match(readme, new RegExp(`${DELAY_MS}ms`));
  assert.match(readme, new RegExp(`最新${MAX_LOG_ENTRIES}件`));
  assert.match(readme, /新しい行を下へ追加/);
  assert.match(readme, /モード変更、タブ移動、ログ消去で保留中の表示を取り消/);
  assert.match(readme, /通常の`div`を使った模式デモ/);
  assert.match(readme, /実データの削除や外部iframeの読み込みは行いません/);
  assert.match(readme, /他のサイトの脆弱性や防御設定は判定できません/);
  assert.match(readme, /file:\/\/[\s\S]*直接開く利用方法には対応していません/);
});

function repositoryFiles(directory = '') {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.git', '.claude'].includes(entry.name)) return [];
    const relative = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? repositoryFiles(relative) : entry.isFile() ? [relative] : [];
  });
}

function treeEntries() {
  const block = [...readme.matchAll(/```[^\r\n]*\r?\n([\s\S]*?)```/g)]
    .find(match => match[1].startsWith('invisible-clicks/'));
  assert.ok(block, 'missing directory tree');
  const lines = block[1].trimEnd().split(/\r?\n/);
  assert.ok(lines.length >= 30, 'directory tree must not be emptied');
  const parents = [''];
  const entries = [];
  for (const [index, line] of lines.entries()) {
    const comment = line.indexOf('#');
    assert.ok(comment > 0 && line.slice(comment + 1).trim().length > 0, `tree row ${index + 1}: missing explanation`);
    const entry = line.slice(0, comment).trimEnd();
    if (index === 0) {
      assert.equal(entry, 'invisible-clicks/');
      continue;
    }
    const match = entry.match(/^([│ ]*)(?:├──|└──) (.+)$/);
    assert.ok(match, `malformed tree row: ${entry}`);
    assert.equal(match[1].length % 4, 0, `invalid tree indentation: ${entry}`);
    const depth = match[1].length / 4 + 1;
    assert.notEqual(parents[depth - 1], undefined, `missing tree parent: ${entry}`);
    const relative = path.posix.join(parents[depth - 1], match[2].replace(/\/$/, ''));
    if (match[2].endsWith('/')) {
      parents[depth] = relative;
      parents.length = depth + 1;
    }
    entries.push(relative);
  }
  return entries;
}

test('READMEツリーは全行に説明があり、自作ファイルを実在する階層で列挙する', () => {
  const files = repositoryFiles();
  const entries = treeEntries();
  assert.equal(entries.length, new Set(entries).size);
  const patterns = entries.map(entry => {
    if (entry.includes('*')) assert.match(entry, /^docs\/assets\/index-\*\.(?:js|css)$/);
    return new RegExp(`^${entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '[^/]+')}$`);
  });
  for (const entry of entries.filter(entry => !entry.includes('*'))) {
    assert.ok(existsSync(path.join(root, entry)), `tree entry does not exist: ${entry}`);
  }
  for (const [index, entry] of entries.entries()) {
    if (entry.includes('*')) {
      assert.ok(files.some(file => patterns[index].test(file)), `tree wildcard matches no files: ${entry}`);
    }
  }
  for (const file of files) {
    assert.ok(patterns.some(pattern => pattern.test(file)), `file missing from README tree: ${file}`);
  }
});

// Specific regression claims only: this is not a semantic proof of documentation correctness.
function falseDefenseClaims(text) {
  const assertions = [
    /CSRF[^。\n]*(?:クリックジャッキング[^。\n]*(?:防げます|防止できます)|prevent(?:s)? clickjacking)/i,
    /meta[^。\n]*(?:埋め込みを(?:禁止できます|防げます)|prevents? (?:framing|embedding))/i,
    /SameSite[^。\n]*埋め込み(?:自体)?を(?:禁止します|防げます)/i,
    /z-index[^。\n]*クリックジャッキングを(?:防げます|防止できます)/i,
  ];
  const negation = /防げません|できません|ではありません|とは(?:説明|言)[^。]*ません|\b(?:not|cannot|never)\b/i;
  return text.split(/(?<=[。.!?])\s*|\r?\n/)
    .filter(sentence => assertions.some(pattern => pattern.test(sentence)) && !negation.test(sentence));
}

test('誤防御検査は肯定の誤説明を検出し、正確な否定文は弾かない', () => {
  assert.equal(falseDefenseClaims('CSRFトークンでクリックジャッキングを防げます。').length, 1);
  assert.equal(falseDefenseClaims('CSRFトークンではクリックジャッキングを防げません。').length, 0);
  assert.equal(falseDefenseClaims('Do not claim CSRF tokens prevent clickjacking of legitimate forms.').length, 0);
  assert.equal(falseDefenseClaims('metaで埋め込みを禁止できます。').length, 1);
  assert.equal(falseDefenseClaims('metaでは埋め込みを防げません。').length, 0);
});

for (const [name, content] of Object.entries(documents)) {
  test(`${name}: 過去版の差分説明と既知の誤防御主張を持ち込まない`, () => {
    assert.ok(content.length > 500, `${name}: document must not be emptied`);
    assert.doesNotMatch(content, /\b(?:previously|formerly|earlier version|used to)\b|以前は|旧版では|前のバージョン/i);
    assert.deepEqual(falseDefenseClaims(content), []);
    assert.doesNotMatch(content, /X-Frame-Options:\s*ALLOW-FROM/i);
    assert.doesNotMatch(content, /数百万人が意図せず|カメラやマイクの権限を無断で許可/);
  });
}

test('packageとlockのルート情報が一致し、Node標準のみでテストできる', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.lockfileVersion, 3);
  for (const key of ['name', 'version', 'license', 'engines', 'devDependencies']) {
    assert.deepEqual(lock.packages[''][key], pkg[key], `lock root mismatch: ${key}`);
  }
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.engines.node, '>=22.18.0');
  assert.equal(pkg.scripts.test, 'node --test test/*.test.js');
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
  assert.deepEqual(Object.keys(pkg.devDependencies).sort(), ['typescript', 'vite']);
  for (const name of Object.keys(pkg.devDependencies)) {
    assert.ok(lock.packages[`node_modules/${name}`]?.version, `missing lock resolution: ${name}`);
  }
});

test('publicの.nojekyllがdocsへコピーされ、Viteの公開先と一致する', () => {
  assert.ok(existsSync(path.join(root, 'public/.nojekyll')));
  assert.ok(existsSync(path.join(root, 'docs/.nojekyll')));
  assert.equal(read('public/.nojekyll'), read('docs/.nojekyll'));
  const config = read('vite.config.ts');
  assert.match(config, /outDir:\s*["']docs["']/);
  assert.doesNotMatch(config, /publicDir:\s*false|copyPublicDir:\s*false/);
  assert.match(config, /base:\s*["']\/invisible-clicks\/["']/);
});

test('CIはpushとPRでNode22を用い、依存インストールなしでnpm testを実行する', () => {
  const workflow = read('.github/workflows/test.yml');
  assert.doesNotMatch(workflow, /\t/);
  assert.match(workflow, /^name:\s*\S+/m);
  const triggers = workflow.match(/^on:\s*\r?\n((?:[ \t].*\r?\n|\r?\n)*)/m)?.[1];
  assert.ok(triggers, 'on mapping must not be missing');
  assert.match(triggers, /^  push:\s*$/m);
  assert.match(triggers, /^  pull_request:\s*$/m);
  assert.match(workflow, /^permissions:\s*\r?\n  contents: read\s*$/m);
  assert.match(workflow, /^jobs:\s*\r?\n  test:\s*\r?\n    runs-on: ubuntu-latest/m);
  assert.match(workflow, /uses: actions\/checkout@v\d+/);
  assert.match(workflow, /uses: actions\/setup-node@v\d+[\s\S]*node-version:\s*['"]?22['"]?\s*$/m);
  assert.match(workflow, /^      - run: npm test\s*$/m);
  assert.doesNotMatch(workflow, /npm (?:install|ci)|continue-on-error|if:\s*(?:false|\$\{\{\s*false)/);
});

test('use-case examples unique to this tool match the demo state', async () => {
  const { activationFor, createDemoState } = await import('../src/demo-state.ts');
  const en = read('README.en.md');
  assert.deepEqual([activationFor(0), activationFor(1), activationFor(0, 'touch'), activationFor(0, 'pen'), activationFor(2, 'mouse')],
    ['keyboard', 'pointer', 'pointer', 'pointer', 'pointer']);
  const events = [];
  const timers = [];
  const demo = createDemoState({ schedule: (fn, ms) => { timers.push([fn, ms]); return timers.length; }, cancel: () => {}, emit: e => events.push(e.type) });
  demo.setActive(true);
  assert.equal(demo.overlay('pointer'), true);
  assert.equal(timers[0][1], DELAY_MS);
  demo.setMode('frame');
  timers[0][0]();
  assert.ok(!events.includes('danger'));
  demo.setMode('overlay');
  demo.overlay('pointer');
  timers[1][0]();
  assert.equal(events.at(-1), 'danger');
  assert.equal(demo.overlay('keyboard'), false);
  assert.ok(readme.includes(`模擬結果は${DELAY_MS}ms後`) && en.includes(`after ${DELAY_MS} ms`));
});
