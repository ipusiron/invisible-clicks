import { activationFor, createDemoState, MAX_LOG_ENTRIES, type DemoEvent, type Mode } from "./demo-state.ts";
import "./i18n.ts";

// 実行時の言語で文言を引く。i18n が無い実行環境（テスト等）では日本語の既定を返す。
type I18nApi = { t: (key: string) => string; lang: "ja" | "en" };
const i18n = (): I18nApi | undefined => (globalThis as unknown as { I18N?: I18nApi }).I18N;
const TR = (key: string, ja: string): string => { const i = i18n(); return i ? i.t(key) : ja; };
const locale = (): string => (i18n()?.lang === "en" ? "en-US" : "ja-JP");

const fakeLike = document.getElementById("fake-like") as HTMLButtonElement;
const invisibleOverlay = document.getElementById("invisible-overlay") as HTMLButtonElement;
const attackOverlay = document.getElementById("attackOverlay") as HTMLInputElement;
const attackFrame = document.getElementById("attackFrame") as HTMLInputElement;
const attackOff = document.getElementById("attackOff") as HTMLInputElement;
const dangerBtn = document.getElementById("danger") as HTMLButtonElement;
const logEl = document.getElementById("log") as HTMLDivElement;
const logStatus = document.getElementById("log-status") as HTMLElement;
const clearLog = document.getElementById("clear-log") as HTMLButtonElement;
const frameWrap = document.getElementById("frameWrap") as HTMLDivElement;
const attackerCard = document.getElementById("attackerCard") as HTMLDivElement;
const tabButtons = [...document.querySelectorAll<HTMLButtonElement>(".tab-button")];
const tabPanels = [...document.querySelectorAll<HTMLElement>(".tab-panel")];

const modeLabel = (mode: Mode): string => ({
  overlay: TR("demo.mode.overlay", "透明オーバーレイの模式デモ"),
  frame: TR("demo.mode.frame", "iframe埋め込みの模式デモ（同一ページ内の図）"),
  off: TR("demo.mode.off", "攻撃を無効化：正規UIのみ表示"),
}[mode]);
const sourceLabel = (source: "overlay" | "frame" | "direct"): string => ({
  overlay: TR("demo.source.overlay", "透明オーバーレイ経由"),
  frame: TR("demo.source.frame", "iframe埋め込みの模式デモ経由（実iframeではありません）"),
  direct: TR("demo.source.direct", "正規UIからの操作"),
}[source]);

function log(line: string) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = "[" + new Date().toLocaleTimeString(locale()) + "] " + line;
  logEl.append(entry);
  while (logEl.childElementCount > MAX_LOG_ENTRIES) logEl.firstElementChild?.remove();
  logEl.scrollTop = logEl.scrollHeight;
  logStatus.textContent = "";
}

function renderEvent(event: DemoEvent) {
  switch (event.type) {
    case "mode":
      log(modeLabel(event.mode));
      break;
    case "normal":
      log(event.activation === "keyboard"
        ? TR("demo.log.normalKeyboard", "通常の『いいね！』操作（キーボード等：透明要素によるポインターの誘導はありません）")
        : TR("demo.log.normal", "通常の『いいね！』操作"));
      break;
    case "queued":
      log(TR("demo.log.queued", "『いいね！』を押したつもりですが、削除の模擬処理を待っています（300ms以内は取り消せます）"));
      break;
    case "danger":
      log(TR("demo.log.dangerPrefix", "削除の模擬結果：") + sourceLabel(event.source)
        + TR("demo.log.dangerSuffix", "。実データは削除していません。"));
      break;
  }
}

const state = createDemoState({
  schedule: (callback, delay) => window.setTimeout(callback, delay),
  cancel: handle => window.clearTimeout(handle as number),
  emit: renderEvent,
});

function renderMode() {
  const { mode, active } = state.snapshot();
  const overlayEnabled = active && mode === "overlay";
  invisibleOverlay.hidden = !overlayEnabled;
  invisibleOverlay.disabled = !overlayEnabled;
  attackerCard.hidden = mode === "off";
  attackerCard.classList.toggle("hidden", mode === "off");
  frameWrap.hidden = !active || mode !== "frame";
  frameWrap.classList.toggle("hidden", frameWrap.hidden);
  attackOverlay.checked = mode === "overlay";
  attackFrame.checked = mode === "frame";
  attackOff.checked = mode === "off";
}

function activateTab(button: HTMLButtonElement) {
  const selected = button.dataset.tab;
  for (const tab of tabButtons) {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const panel of tabPanels) {
    const active = panel.id === selected;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  }
  state.setActive(selected === "demo");
  renderMode();
}

for (const [index, button] of tabButtons.entries()) {
  button.addEventListener("click", () => activateTab(button));
  button.addEventListener("keydown", event => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabButtons.length;
    else if (event.key === "ArrowLeft") next = (index + tabButtons.length - 1) % tabButtons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabButtons.length - 1;
    else return;
    event.preventDefault();
    activateTab(tabButtons[next]);
    tabButtons[next].focus();
  });
}

const modes: [HTMLInputElement, Mode][] = [
  [attackOverlay, "overlay"], [attackFrame, "frame"], [attackOff, "off"],
];
for (const [radio, mode] of modes) {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    state.setMode(mode);
    renderMode();
  });
}

fakeLike.addEventListener("click", event => state.like(activationFor(event.detail, (event as PointerEvent).pointerType)));
function focusVisibleTarget(event: MouseEvent) {
  // Pointer Eventsを発火しないマウス操作でも、透明要素にフォーカスを移さない。
  event.preventDefault();
  fakeLike.focus();
}
invisibleOverlay.addEventListener("pointerdown", focusVisibleTarget);
invisibleOverlay.addEventListener("mousedown", focusVisibleTarget);
invisibleOverlay.addEventListener("click", event => state.overlay(activationFor(event.detail, (event as PointerEvent).pointerType)));
dangerBtn.addEventListener("click", () => state.danger("direct"));
frameWrap.addEventListener("click", event => {
  const target = event.target;
  if (target instanceof Element && target.closest('[data-frame="danger"]')) state.danger("frame");
});
clearLog.addEventListener("click", () => {
  state.cancelPending();
  logEl.replaceChildren();
  logStatus.textContent = TR("demo.log.clearStatus", "ログを消去し、保留中の模擬処理を取り消しました。");
});
window.addEventListener("pagehide", () => state.cancelPending());
renderMode();
