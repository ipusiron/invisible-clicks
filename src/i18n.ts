// 画面の日英切り替え。index.html の data-i18n（textContent）/ data-i18n-html（innerHTML）/
// data-i18n-attr（"属性:キー,属性:キー"）を見て差し替える。言語は localStorage に残す。
// main.ts からは副作用 import で読み込み、globalThis.I18N 経由で動的文言を引く。
import messages from "./messages.json";

type Lang = "ja" | "en";
type Dict = Record<string, string>;
const dicts = messages as Record<Lang, Dict>;
let lang: Lang = "ja";
const listeners: Array<(lang: Lang) => void> = [];

function dict(): Dict {
  return dicts[lang] || dicts.ja;
}

function t(key: string): string {
  const d = dict();
  if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
  return Object.prototype.hasOwnProperty.call(dicts.ja, key) ? dicts.ja[key] : key;
}

function apply(): void {
  const d = dict();
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (k && d[k] != null) el.textContent = d[k];
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach(el => {
    const k = el.getAttribute("data-i18n-html");
    if (k && d[k] != null) el.innerHTML = d[k];
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-attr]").forEach(el => {
    const spec = el.getAttribute("data-i18n-attr") || "";
    for (const pair of spec.split(",")) {
      const [attr, key] = pair.split(":").map(s => s.trim());
      if (attr && key && d[key] != null) el.setAttribute(attr, d[key]);
    }
  });
  document.documentElement.setAttribute("lang", lang);
  const btn = document.getElementById("langToggle");
  if (btn) btn.textContent = t("ui.langToggle");
}

function set(next: Lang): void {
  if (next !== "ja" && next !== "en") return;
  lang = next;
  try { localStorage.setItem("lang", lang); } catch { /* 使えない環境でも続行 */ }
  apply();
  for (const fn of listeners) {
    try { fn(lang); } catch { /* 1つで止めない */ }
  }
}

function init(): void {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "ja" || saved === "en") lang = saved;
  } catch { /* 既定のまま */ }
  apply();
  const btn = document.getElementById("langToggle");
  if (btn) btn.addEventListener("click", () => set(lang === "ja" ? "en" : "ja"));
}

const api = {
  t,
  apply,
  set,
  get lang(): Lang { return lang; },
  onChange(fn: (lang: Lang) => void): void { if (typeof fn === "function") listeners.push(fn); },
};
(globalThis as unknown as { I18N: typeof api }).I18N = api;

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

export {};
