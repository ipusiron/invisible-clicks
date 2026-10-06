import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const ja = read("README.md").replace(/<!--[\s\S]*?-->/g, "");
const en = read("README.en.md");
function headings(text) {
  let fence = null;
  return text.split(/\r?\n/).flatMap(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (fence === marker[1][0]) fence = null;
      return [];
    }
    return !fence && /^#{1,6} /.test(line) ? [line.match(/^#+/)[0]] : [];
  });
}
const links = text => [...text.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
const commands = text => [...text.matchAll(/```(?:sh|bash)\r?\n([\s\S]*?)```/g)]
  .map(match => match[1].replace(/\r\n/g, "\n").trim());
const tableNumbers = text => text.split(/\r?\n/).filter(line => /^\|/.test(line))
  .map(line => line.match(/\d[\d,.]*/g) || []).filter(row => row.length);

test("English README has reciprocal links and the complete Japanese heading hierarchy", () => {
  assert.match(ja, /\[English\]\(README\.en\.md\)/);
  assert.match(en, /\[日本語\]\(README\.md\)/);
  assert.deepEqual(headings(en), headings(ja));
  assert.ok(headings(en).length >= 20);
  assert.match(en, /interface.*Japanese/i);
  assert.match(en, /Japanese interface/i);
});

test("English README preserves source links and every local target exists", () => {
  const comparable = text => links(text).filter(target => !/^README(?:\.en)?\.md$/.test(target)).sort();
  assert.deepEqual(comparable(en), comparable(ja));
  for (const target of links(en)) {
    if (/^(?:https?:|#)/.test(target)) continue;
    assert.ok(fs.existsSync(path.join(root, target.split("#")[0])), target);
  }
});

test("English README preserves runnable commands and numerical table values", () => {
  assert.deepEqual(commands(en), commands(ja));
  assert.deepEqual(tableNumbers(en), tableNumbers(ja));
  assert.match(en, /npm test/);
});

test("English README retains simulation, keyboard, storage, and HTTP-header limitations", () => {
  for (const phrase of [
    "does not delete real data", "100 entries", "300 ms", "ordinary `div` elements",
    "does not imply that keyboard input prevents every form of clickjacking",
    "HTTP response headers", "without persistent browser storage", "22.18",
    "Putting those restrictions in meta tags does not enforce them"
  ]) assert.ok(en.includes(phrase), phrase);
  assert.match(en, /frame-ancestors/);
  assert.match(en, /X-Frame-Options/);
});
